#!/usr/bin/env node
/**
 * Refresh committed BAH snapshots after DTMO publishes a new calendar year.
 *
 * Example:
 *   node scripts/build-bah-snapshots.mjs --year 2026 --base fort-bliss --rank 5 --rank 6
 *
 * This script is run on demand only. It is intentionally not part of Next build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RANK_MAPPING,
  extractBAHData,
  fetchPage,
} from '../lib/bah-scraper-core.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const TARGETS_PATH = path.join(repoRoot, 'content', '_data', 'bah-base-targets.json');
const SNAPSHOT_ROOT = path.join(repoRoot, 'content', '_data', 'bah-snapshots');

export const DEFAULT_RANK_IDS = ['5', '6', '7', '18', '19'];

function readJson(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function writeJson(filepath, value) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseArgs(argv) {
  const options = {
    year: String(new Date().getFullYear()),
    base: null,
    rankIds: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--year') {
      options.year = argv[++index];
    } else if (arg === '--base') {
      options.base = argv[++index];
    } else if (arg === '--rank') {
      options.rankIds.push(argv[++index]);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!/^\d{4}$/.test(options.year)) {
    throw new Error('--year must be a 4-digit year');
  }

  return {
    ...options,
    rankIds: options.rankIds.length ? options.rankIds : DEFAULT_RANK_IDS,
  };
}

function mhaCode(value) {
  return /\(([A-Z]{2}\d{3})\)/.exec(value)?.[1] ?? null;
}

export async function buildSnapshotForTarget(
  target,
  {
    year,
    rankIds = DEFAULT_RANK_IDS,
    fetcher = fetchPage,
    generatedAt = new Date().toISOString(),
  },
) {
  const ranks = [];
  let sourceYear = String(year);

  for (const rankId of rankIds) {
    if (!RANK_MAPPING[rankId]) {
      throw new Error(`Invalid rank ID for ${target.slug}: ${rankId}`);
    }

    const result = await extractBAHData(String(year), target.primaryZip, rankId, fetcher);
    const resultMhaCode = mhaCode(result.mha);
    if (target.expectedMha && resultMhaCode !== target.expectedMha) {
      throw new Error(
        `${target.slug} expected MHA ${target.expectedMha}, got ${result.mha}`,
      );
    }

    sourceYear = result.year;
    ranks.push({
      rankId,
      rank: result.rank,
      mha: result.mha,
      withDependents: result.withDependents,
      withoutDependents: result.withoutDependents,
      difference: result.difference,
    });
  }

  return {
    baseName: target.baseName,
    slug: target.slug,
    stateSlug: target.stateSlug,
    primaryZip: target.primaryZip,
    expectedMha: target.expectedMha ?? null,
    year: String(year),
    sourceYear,
    source: 'travel.dod.mil/DTMO',
    generatedAt,
    ranks,
  };
}

function snapshotPathFor(target, year) {
  return path.join(SNAPSHOT_ROOT, target.slug, `${year}.json`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const targets = readJson(TARGETS_PATH).filter((target) => {
    return options.base ? target.slug === options.base : true;
  });

  if (targets.length === 0) {
    throw new Error(`No BAH targets matched ${options.base ?? 'all bases'}`);
  }

  for (const target of targets) {
    const snapshot = await buildSnapshotForTarget(target, {
      year: options.year,
      rankIds: options.rankIds,
    });
    const outputPath = snapshotPathFor(target, options.year);
    writeJson(outputPath, snapshot);
    console.log(
      `Wrote ${path.relative(repoRoot, outputPath)} (${snapshot.ranks.length} ranks)`,
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
