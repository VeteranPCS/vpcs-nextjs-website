#!/usr/bin/env node

import { createReadStream } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { createClient } from '@sanity/client';

const DEFAULT_FOLDER = join(process.cwd(), 'updated-states');
const VALID_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const DEFAULT_TOKEN_ENV = 'SANITY_STATE_UPDATE_TOKEN';

const args = new Set(process.argv.slice(2));
const dryRun = !args.has('--apply');
const useCliToken = args.has('--use-cli-token');
const folderArg = process.argv.find((arg) => arg.startsWith('--folder='));
const folder = folderArg
  ? folderArg.slice('--folder='.length)
  : process.env.STATE_IMAGES_FOLDER || DEFAULT_FOLDER;
const tokenEnvArg = process.argv.find((arg) => arg.startsWith('--token-env='));
const tokenEnv = tokenEnvArg ? tokenEnvArg.slice('--token-env='.length) : DEFAULT_TOKEN_ENV;

const requiredEnv = [
  'NEXT_PUBLIC_SANITY_PROJECT_ID',
  'NEXT_PUBLIC_SANITY_DATASET',
  'NEXT_PUBLIC_SANITY_API_VERSION',
];

const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  throw new Error(`Missing Sanity env vars: ${missingEnv.join(', ')}`);
}

async function getToken() {
  if (!useCliToken) {
    const token = process.env[tokenEnv];

    if (!token) {
      throw new Error(`Missing Sanity write token env var: ${tokenEnv}`);
    }

    return token;
  }

  const configPath = join(homedir(), '.config', 'sanity', 'config.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));

  if (!config.authToken) {
    throw new Error(`No authToken found in ${configPath}`);
  }

  return config.authToken;
}

function normalizeStateName(value) {
  return value
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function contentTypeForExtension(ext) {
  switch (ext.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

async function listImageFiles(dir) {
  const entries = await readdir(dir);
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry);
    const info = await stat(path);
    const ext = extname(entry).toLowerCase();

    if (info.isFile() && VALID_EXTENSIONS.has(ext)) {
      files.push({
        name: entry,
        path,
        ext,
        size: info.size,
        normalizedState: normalizeStateName(entry),
      });
    }
  }

  return files.sort((a, b) => a.name.localeCompare(b.name));
}

async function main() {
  const token = await getToken();
  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
    token,
    useCdn: false,
  });

  const [files, states] = await Promise.all([
    listImageFiles(folder),
    client.fetch(`*[_type == "state_list"]{
      _id,
      _rev,
      state_name,
      short_name,
      state_slug,
      state_map,
      "state_map_asset_filename": state_map.asset->originalFilename,
      "state_map_asset_size": state_map.asset->size
    } | order(state_name asc)`),
  ]);

  const statesByName = new Map();
  for (const state of states) {
    const normalized = normalizeStateName(state.state_name || '');
    const existing = statesByName.get(normalized) || [];
    existing.push(state);
    statesByName.set(normalized, existing);
  }

  const matches = [];
  const skips = [];
  const issues = [];

  for (const file of files) {
    const candidates = statesByName.get(file.normalizedState) || [];

    if (candidates.length === 0) {
      issues.push(`No state_list document matched "${file.name}"`);
      continue;
    }

    if (candidates.length > 1) {
      issues.push(`Multiple state_list documents matched "${file.name}": ${candidates.map((state) => `${state.state_name} (${state._id})`).join(', ')}`);
      continue;
    }

    const state = candidates[0];
    if (
      state.state_map_asset_filename === file.name
      && state.state_map_asset_size === file.size
    ) {
      skips.push({ file, state });
      continue;
    }

    matches.push({ file, state });
  }

  console.log(`Mode: ${dryRun ? 'dry-run' : 'apply'}`);
  console.log(`Folder: ${folder}`);
  console.log(`Images found: ${files.length}`);
  console.log(`State documents fetched: ${states.length}`);
  console.log(`Updates needed: ${matches.length}`);
  console.log(`Already current: ${skips.length}`);

  if (issues.length > 0) {
    console.log('\nIssues:');
    for (const issue of issues) {
      console.log(`- ${issue}`);
    }
    throw new Error('Refusing to continue until image/state matching issues are resolved.');
  }

  if (skips.length > 0) {
    console.log('\nAlready current:');
    for (const { file, state } of skips) {
      const currentRef = state.state_map?.asset?._ref || '(none)';
      console.log(`- ${state.state_name} (${state.short_name}) ${state._id}: ${basename(file.path)} already matches ${currentRef}`);
    }
  }

  if (matches.length > 0) {
    console.log('\nPlanned updates:');
    for (const { file, state } of matches) {
      const currentRef = state.state_map?.asset?._ref || '(none)';
      console.log(`- ${state.state_name} (${state.short_name}) ${state._id}: ${basename(file.path)} replaces ${currentRef}`);
    }
  }

  if (dryRun) {
    console.log('\nDry run complete. Re-run with --apply to upload assets and patch Sanity documents.');
    return;
  }

  if (matches.length === 0) {
    console.log('\nNo updates needed.');
    return;
  }

  console.log('\nApplying updates:');
  for (const { file, state } of matches) {
    const asset = await client.assets.upload('image', createReadStream(file.path), {
      filename: file.name,
      contentType: contentTypeForExtension(file.ext),
    });

    const nextStateMap = {
      ...(state.state_map || {}),
      _type: 'image',
      asset: {
        _type: 'reference',
        _ref: asset._id,
      },
    };

    if (!nextStateMap.alt) {
      nextStateMap.alt = `${state.state_name} state map`;
    }

    const result = await client
      .patch(state._id)
      .set({ state_map: nextStateMap })
      .commit({ autoGenerateArrayKeys: true });

    console.log(`- Updated ${state.state_name} (${state.short_name}): ${asset._id} -> ${result._rev}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
