#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SUPPORTED_EXTENSIONS = new Set(['.svg', '.webp', '.png', '.jpg', '.jpeg']);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '../../../..');

function usage() {
  console.error(
    'Usage: update-state-maps.mjs [--install --allow-replacements] [--audit] [--json] [--updated-at <ISO>] [--state-dir <path>] [--state-list <path>] <image...>',
  );
}

function parseArguments(argv) {
  const options = {
    install: false,
    allowReplacements: false,
    audit: false,
    json: false,
    updatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    stateDirectory: path.join(repositoryRoot, 'public/images/states'),
    stateListPath: path.join(repositoryRoot, 'content/_data/site/state_list.json'),
    files: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--install') {
      options.install = true;
    } else if (argument === '--allow-replacements') {
      options.allowReplacements = true;
    } else if (argument === '--audit') {
      options.audit = true;
    } else if (argument === '--json') {
      options.json = true;
    } else if (argument === '--updated-at') {
      const value = argv[index + 1];
      if (!value) throw new Error('--updated-at requires an ISO timestamp');
      options.updatedAt = value;
      index += 1;
    } else if (argument === '--state-dir') {
      const value = argv[index + 1];
      if (!value) throw new Error('--state-dir requires a path');
      options.stateDirectory = path.resolve(value);
      index += 1;
    } else if (argument === '--state-list') {
      const value = argv[index + 1];
      if (!value) throw new Error('--state-list requires a path');
      options.stateListPath = path.resolve(value);
      index += 1;
    } else if (argument.startsWith('--')) {
      throw new Error(`Unknown option: ${argument}`);
    } else {
      options.files.push(path.resolve(argument));
    }
  }

  if (Number.isNaN(Date.parse(options.updatedAt))) throw new Error('--updated-at must be a valid ISO timestamp');
  if (options.audit && (options.install || options.allowReplacements || options.files.length > 0)) {
    throw new Error('--audit cannot be combined with installation options or image files');
  }
  if (!options.audit && options.files.length === 0) throw new Error('Provide at least one state image');
  if (options.allowReplacements && !options.install) {
    throw new Error('--allow-replacements is valid only with --install');
  }

  return options;
}

function normalizeName(value) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function sha256(filePath) {
  return createHash('sha256').update(await readFile(filePath)).digest('hex');
}

async function loadStates(stateListPath) {
  const raw = await readFile(stateListPath, 'utf8');
  const states = JSON.parse(raw);
  if (!Array.isArray(states)) throw new Error(`${stateListPath}: expected a JSON array`);
  return { raw, states };
}

function stateLookup(states) {
  const byNormalizedName = new Map();
  for (const state of states) {
    const names = [normalizeName(state.state_name ?? ''), normalizeName(state.state_slug?.current ?? '')];
    for (const name of new Set(names)) {
      if (!name) continue;
      const matches = byNormalizedName.get(name) ?? [];
      matches.push(state);
      byNormalizedName.set(name, matches);
    }
  }
  return byNormalizedName;
}

async function listStateFiles(stateDirectory, slug) {
  const entries = await readdir(stateDirectory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => path.parse(name).name === slug && SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort()
    .map((name) => path.join(stateDirectory, name));
}

async function inspectImage(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error(`${path.basename(filePath)}: unsupported extension ${extension || '(none)'}`);
  }

  if (extension === '.svg') {
    const svg = await readFile(filePath, 'utf8');
    if (
      /<(?:script|foreignObject)\b/i.test(svg) ||
      /\bon[a-z]+\s*=/i.test(svg) ||
      /(?:href|xlink:href)\s*=\s*["']\s*(?:https?:|data:|javascript:)/i.test(svg)
    ) {
      throw new Error(`${path.basename(filePath)}: SVG contains active or external content`);
    }
  }

  const metadata = await sharp(filePath, { animated: true }).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`${path.basename(filePath)}: image dimensions could not be read`);
  }
  if ((metadata.pages ?? 1) !== 1) {
    throw new Error(`${path.basename(filePath)}: animated or multi-page images are not supported`);
  }
  const expectedFormats = extension === '.jpg' || extension === '.jpeg'
    ? new Set(['jpeg'])
    : new Set([extension.slice(1)]);
  if (!metadata.format || !expectedFormats.has(metadata.format)) {
    throw new Error(
      `${path.basename(filePath)}: extension ${extension} does not match detected format ${metadata.format ?? 'unknown'}`,
    );
  }

  return { extension, width: metadata.width, height: metadata.height, format: metadata.format };
}

async function inspectBatch(files, states, stateDirectory) {
  const lookup = stateLookup(states);
  const seenSlugs = new Set();
  const items = [];

  for (const source of files) {
    const normalized = normalizeName(path.basename(source));
    const matches = lookup.get(normalized) ?? [];
    if (matches.length !== 1) {
      throw new Error(
        `${path.basename(source)}: expected exactly one state match, found ${matches.length}`,
      );
    }
    const state = matches[0];
    const slug = state.state_slug?.current;
    if (typeof slug !== 'string' || !slug) throw new Error(`${path.basename(source)}: matched state has no slug`);
    if (seenSlugs.has(slug)) throw new Error(`Duplicate state in batch: ${slug}`);
    seenSlugs.add(slug);

    const image = await inspectImage(source);
    const destination = path.join(stateDirectory, `${slug}${image.extension}`);
    if (path.resolve(source) === path.resolve(destination)) {
      throw new Error(`${path.basename(source)}: source must be outside the state image directory`);
    }
    const existing = await listStateFiles(stateDirectory, slug);
    const collision = existing.length === 0
      ? 'new'
      : existing.length === 1 && existing[0] === destination && (await sha256(source)) === (await sha256(destination))
        ? 'identical'
        : 'replacement';

    items.push({
      source,
      sourceName: path.basename(source),
      state,
      slug,
      extension: image.extension,
      format: image.format,
      width: image.width,
      height: image.height,
      destination,
      existing,
      remove: existing.filter((file) => file !== destination),
      collision,
    });
  }

  return items;
}

async function auditStateFiles(states, stateDirectory) {
  const entries = await readdir(stateDirectory, { withFileTypes: true });
  const imageNames = entries
    .filter((entry) => entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name);
  const knownSlugs = new Set(states.map((state) => state.state_slug?.current).filter(Boolean));
  const issues = [];

  for (const name of imageNames) {
    if (!knownSlugs.has(path.parse(name).name)) issues.push(`Unrecognized state image: ${name}`);
  }

  for (const state of states) {
    const slug = state.state_slug?.current;
    if (typeof slug !== 'string' || !slug) {
      issues.push(`${state.state_name ?? '(unknown state)'}: missing state slug`);
      continue;
    }
    const files = imageNames.filter((name) => path.parse(name).name === slug);
    if (files.length !== 1) {
      issues.push(`${slug}: expected exactly one image, found ${files.length}${files.length ? ` (${files.join(', ')})` : ''}`);
      continue;
    }
    const expectedPath = `/images/states/${files[0]}`;
    if (state.state_map?.path !== expectedPath) {
      issues.push(`${slug}: state_map.path is ${state.state_map?.path ?? '(missing)'}, expected ${expectedPath}`);
      continue;
    }
    const metadata = await inspectImage(path.join(stateDirectory, files[0]));
    if (state.state_map?.width !== metadata.width || state.state_map?.height !== metadata.height) {
      issues.push(
        `${slug}: JSON dimensions ${state.state_map?.width ?? '?'}x${state.state_map?.height ?? '?'} do not match ${metadata.width}x${metadata.height}`,
      );
    }
  }

  if (issues.length > 0) throw new Error(`State image audit failed:\n- ${issues.join('\n- ')}`);
  return { states: states.length, images: imageNames.length };
}

function nextStateList(states, items, updatedAt) {
  const bySlug = new Map(items.map((item) => [item.slug, item]));
  return states.map((state) => {
    const item = bySlug.get(state.state_slug?.current);
    if (!item) return state;
    return {
      ...state,
      _updatedAt: updatedAt,
      state_map: {
        alt: typeof state.state_map?.alt === 'string' && state.state_map.alt.trim()
          ? state.state_map.alt
          : state.state_name,
        height: item.height,
        path: `/images/states/${path.basename(item.destination)}`,
        width: item.width,
      },
    };
  });
}

async function installBatch(options, originalRaw, states, items) {
  const replacements = items.filter((item) => item.collision === 'replacement');
  if (replacements.length > 0 && !options.allowReplacements) {
    throw new Error(
      `Refusing replacement without --allow-replacements: ${replacements.map((item) => item.slug).join(', ')}`,
    );
  }

  const backups = new Map();
  for (const item of items) {
    for (const file of item.existing) backups.set(file, await readFile(file));
  }
  const nextStates = nextStateList(states, items, options.updatedAt);
  const temporaryImages = items.map((item, index) => `${item.destination}.tmp-${process.pid}-${index}`);
  const temporaryJson = `${options.stateListPath}.tmp-${process.pid}`;

  await mkdir(options.stateDirectory, { recursive: true });
  try {
    for (let index = 0; index < items.length; index += 1) {
      await copyFile(items[index].source, temporaryImages[index]);
    }
    await writeFile(temporaryJson, `${JSON.stringify(nextStates, null, 2)}\n`);
    for (let index = 0; index < items.length; index += 1) {
      await rename(temporaryImages[index], items[index].destination);
    }
    for (const item of items) {
      for (const oldFile of item.remove) await rm(oldFile);
    }
    await rename(temporaryJson, options.stateListPath);
    await auditStateFiles(nextStates, options.stateDirectory);
  } catch (error) {
    await writeFile(options.stateListPath, originalRaw);
    const destinationPaths = new Set(items.map((item) => item.destination));
    for (const destination of destinationPaths) {
      if (!backups.has(destination)) await rm(destination, { force: true });
    }
    for (const [file, contents] of backups) await writeFile(file, contents);
    throw error;
  } finally {
    for (const temporary of temporaryImages) await rm(temporary, { force: true });
    await rm(temporaryJson, { force: true });
  }

  return nextStates;
}

function reportItems(items, installed, json) {
  const result = items.map((item) => ({
    state: item.state.state_name,
    slug: item.slug,
    source: item.source,
    destination: item.destination,
    format: item.format,
    width: item.width,
    height: item.height,
    collision: item.collision,
    remove: item.remove,
    action: installed ? (item.collision === 'identical' ? 'metadata-updated' : 'installed') : null,
  }));
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  for (const item of result) {
    console.log(
      `${item.state}  ${item.width}x${item.height} ${item.format.padEnd(4)}  ${item.collision.padEnd(11)}  ${item.destination}`,
    );
    for (const oldFile of item.remove) console.log(`  remove: ${oldFile}`);
  }
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    usage();
    throw error;
  }

  const { raw, states } = await loadStates(options.stateListPath);
  if (options.audit) {
    const result = await auditStateFiles(states, options.stateDirectory);
    console.log(`State image audit passed: ${result.states} states, ${result.images} images`);
    return;
  }

  const items = await inspectBatch(options.files, states, options.stateDirectory);
  if (options.install) await installBatch(options, raw, states, items);
  reportItems(items, options.install, options.json);
}

main().catch((error) => {
  console.error(`State map update failed: ${error.message}`);
  process.exitCode = 1;
});
