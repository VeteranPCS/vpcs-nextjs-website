#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { access, copyFile, mkdir, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SUPPORTED_FORMATS = new Set(['webp', 'png', 'jpeg']);
const ACCOUNT_ID_PATTERN = /(?:^|-)(001[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?)$/;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '../../../..');

function usage() {
  console.error(
    'Usage: validate-headshots.mjs [--install] [--allow-replacements] [--json] [--agent-dir <path>] <image...>',
  );
}

function parseArguments(argv) {
  const options = {
    install: false,
    allowReplacements: false,
    json: false,
    agentDirectory: path.join(repositoryRoot, 'public/images/agents'),
    files: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--install') {
      options.install = true;
    } else if (argument === '--allow-replacements') {
      options.allowReplacements = true;
    } else if (argument === '--json') {
      options.json = true;
    } else if (argument === '--agent-dir') {
      const directory = argv[index + 1];
      if (!directory) throw new Error('--agent-dir requires a path');
      options.agentDirectory = path.resolve(directory);
      index += 1;
    } else if (argument.startsWith('--')) {
      throw new Error(`Unknown option: ${argument}`);
    } else {
      options.files.push(path.resolve(argument));
    }
  }

  if (options.files.length === 0) throw new Error('Provide at least one image');
  if (options.allowReplacements && !options.install) {
    throw new Error('--allow-replacements is valid only with --install');
  }

  return options;
}

function extractAccountId(filePath) {
  const parsed = path.parse(filePath);
  const match = parsed.name.match(ACCOUNT_ID_PATTERN);
  if (!match) {
    throw new Error(
      `${parsed.base}: filename must end with a 15- or 18-character Salesforce Account ID beginning with 001`,
    );
  }
  return match[1].slice(0, 15);
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

async function inspectFile(filePath, agentDirectory) {
  const accountId = extractAccountId(filePath);
  const metadata = await sharp(filePath, { animated: true }).metadata();

  if (!metadata.format || !SUPPORTED_FORMATS.has(metadata.format)) {
    throw new Error(`${path.basename(filePath)}: unsupported image format ${metadata.format ?? 'unknown'}`);
  }
  if (!metadata.width || !metadata.height) {
    throw new Error(`${path.basename(filePath)}: image dimensions could not be read`);
  }
  if ((metadata.pages ?? 1) !== 1) {
    throw new Error(`${path.basename(filePath)}: animated or multi-page images are not supported`);
  }

  const destination = path.join(agentDirectory, `${accountId}.webp`);
  const destinationExists = await exists(destination);
  let collision = 'new';
  if (destinationExists) {
    collision = metadata.format === 'webp' && (await sha256(filePath)) === (await sha256(destination))
      ? 'identical'
      : 'replacement';
  }

  return {
    source: filePath,
    sourceName: path.basename(filePath),
    accountId,
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    destination,
    collision,
  };
}

async function installFile(item) {
  if (item.collision === 'identical') return 'unchanged';

  const temporary = `${item.destination}.tmp-${process.pid}`;
  try {
    if (item.format === 'webp') {
      await copyFile(item.source, temporary);
    } else {
      await sharp(item.source).rotate().webp({ quality: 90 }).toFile(temporary);
    }
    await rename(temporary, item.destination);
    return item.collision === 'new' ? 'created' : 'replaced';
  } finally {
    await rm(temporary, { force: true });
  }
}

function printHuman(items, installed) {
  for (const item of items) {
    const action = installed.get(item.accountId);
    const suffix = action ? ` -> ${action}` : '';
    console.log(
      `${item.accountId}  ${item.width}x${item.height} ${item.format.padEnd(4)}  ${item.collision.padEnd(11)}  ${item.destination}${suffix}`,
    );
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

  const items = [];
  const seenIds = new Set();
  for (const file of options.files) {
    const item = await inspectFile(file, options.agentDirectory);
    if (seenIds.has(item.accountId)) {
      throw new Error(`Duplicate Salesforce Account ID in batch: ${item.accountId}`);
    }
    seenIds.add(item.accountId);
    items.push(item);
  }

  const replacements = items.filter((item) => item.collision === 'replacement');
  if (options.install && replacements.length > 0 && !options.allowReplacements) {
    throw new Error(
      `Refusing to replace existing headshot(s) without --allow-replacements: ${replacements.map((item) => item.accountId).join(', ')}`,
    );
  }

  const installed = new Map();
  if (options.install) {
    await mkdir(options.agentDirectory, { recursive: true });
    for (const item of items) installed.set(item.accountId, await installFile(item));
  }

  if (options.json) {
    console.log(JSON.stringify(items.map((item) => ({ ...item, action: installed.get(item.accountId) ?? null })), null, 2));
  } else {
    printHuman(items, installed);
  }
}

main().catch((error) => {
  console.error(`Headshot validation failed: ${error.message}`);
  process.exitCode = 1;
});
