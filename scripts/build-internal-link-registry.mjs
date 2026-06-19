#!/usr/bin/env node
// Build a deterministic JSON registry of every blog post for internal-link
// discovery. This script runs under plain Node, so it consumes only script-safe
// data/modules and never imports TS or @/ aliases.
//
// Run:
//   node scripts/build-internal-link-registry.mjs
//
// Output:
//   content/_registry/internal-links.json (committed)

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import {
  BLOG_COMPONENTS,
  normalizeBlogComponentSlug,
  resolveBlogState,
  validateBlogStateMap,
} from './lib/blog-data.mjs';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), '..');
const CONTENT_DIR = join(ROOT, 'content', 'blog');
const REGISTRY_DIR = join(ROOT, 'content', '_registry');
const OUT_PATH = join(REGISTRY_DIR, 'internal-links.json');

function stripFences(md) {
  return md.replace(/```[\s\S]*?```/g, '');
}

function extractH2Outline(md) {
  const lines = stripFences(md).split('\n');
  const out = [];
  for (const line of lines) {
    const m = /^##\s+(?!#)(.+)$/.exec(line);
    if (m) {
      const text = m[1].replace(/[*_`]+/g, '').trim();
      if (text) out.push(text);
    }
  }
  return out;
}

function shortDescription(fm, content) {
  if (typeof fm.description === 'string' && fm.description.trim()) {
    return fm.description.trim();
  }
  const stripped = stripFences(content)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~`]/g, '')
    .trim();
  if (!stripped) return '';
  const firstPara = stripped.split(/\n\n+/)[0].trim();
  return firstPara.length > 240 ? firstPara.slice(0, 237) + '...' : firstPara;
}

function readPosts() {
  if (!existsSync(CONTENT_DIR)) return [];
  return readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((filename) => {
      const filepath = join(CONTENT_DIR, filename);
      const raw = readFileSync(filepath, 'utf-8');
      const { data, content } = matter(raw);
      return { slug: filename.replace(/\.mdx$/, ''), filepath, data, content };
    });
}

function buildEntry(post) {
  const fm = post.data;
  const component = typeof fm.component === 'string' ? fm.component : null;
  const componentSlug = normalizeBlogComponentSlug(component);
  if (component && !componentSlug) {
    throw new Error(`Unknown blog component in ${post.slug}: ${component}`);
  }

  const resolvedState = resolveBlogState(post);

  return {
    slug: post.slug,
    title: typeof fm.title === 'string' ? fm.title : post.slug,
    url: '/blog/' + post.slug,
    component,
    componentSlug,
    stateSlug: resolvedState?.stateSlug ?? null,
    stateSource: resolvedState?.source ?? null,
    categories: Array.isArray(fm.categories)
      ? fm.categories.map(String).sort((a, b) => a.localeCompare(b))
      : [],
    description: shortDescription(fm, post.content),
    publishedAt: fm.publishedAt ?? null,
    updatedAt: fm.updatedAt ?? null,
    primaryKeyword: fm.primaryKeyword ?? null,
    secondaryKeywords: Array.isArray(fm.secondaryKeywords)
      ? fm.secondaryKeywords.map(String).sort((a, b) => a.localeCompare(b))
      : [],
    h2Outline: extractH2Outline(post.content),
  };
}

function sortGrouped(grouped) {
  for (const key of Object.keys(grouped)) grouped[key].sort();
  return Object.fromEntries(Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)));
}

function groupByComponent(entries) {
  const grouped = {};
  for (const entry of entries) {
    const key = entry.component ?? '(uncategorized)';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(entry.slug);
  }
  return sortGrouped(grouped);
}

function groupByComponentSlug(entries) {
  const grouped = Object.fromEntries(BLOG_COMPONENTS.map((component) => [component.slug, []]));
  for (const entry of entries) {
    const key = entry.componentSlug ?? 'uncategorized';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(entry.slug);
  }
  return sortGrouped(grouped);
}

function groupByState(entries) {
  const grouped = {};
  for (const entry of entries) {
    if (!entry.stateSlug) continue;
    if (!grouped[entry.stateSlug]) grouped[entry.stateSlug] = [];
    grouped[entry.stateSlug].push(entry.slug);
  }
  return sortGrouped(grouped);
}

function stateCoverage(entries) {
  const bySource = {};
  const unmappedHighIntent = [];
  for (const entry of entries) {
    if (entry.stateSource) bySource[entry.stateSource] = (bySource[entry.stateSource] ?? 0) + 1;
    if (!entry.stateSlug && /(^|-)pcs(-|$)|base|bases|fort-|camp-|afb|naval|joint-base|bah/.test(entry.slug)) {
      unmappedHighIntent.push(entry.slug);
    }
  }

  return {
    resolved: entries.filter((entry) => entry.stateSlug).length,
    bySource: Object.fromEntries(Object.entries(bySource).sort(([a], [b]) => a.localeCompare(b))),
    unmappedHighIntent: unmappedHighIntent.sort((a, b) => a.localeCompare(b)),
  };
}

function contentHashFor(registryWithoutHash) {
  return createHash('sha256').update(JSON.stringify(registryWithoutHash)).digest('hex');
}

function main() {
  const stateMapErrors = validateBlogStateMap();
  if (stateMapErrors.length > 0) {
    throw new Error('Invalid blog state map:\n' + stateMapErrors.map((error) => `- ${error}`).join('\n'));
  }

  const posts = readPosts();
  const entries = posts.map(buildEntry);
  entries.sort((a, b) => a.slug.localeCompare(b.slug));

  const registryWithoutHash = {
    totalPosts: entries.length,
    byComponent: groupByComponent(entries),
    byComponentSlug: groupByComponentSlug(entries),
    byState: groupByState(entries),
    stateCoverage: stateCoverage(entries),
    posts: entries,
  };

  const registry = {
    contentHash: contentHashFor(registryWithoutHash),
    ...registryWithoutHash,
  };

  mkdirSync(REGISTRY_DIR, { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(registry, null, 2) + '\n');
  console.log('Wrote ' + OUT_PATH);
  console.log('  ' + entries.length + ' posts across ' + Object.keys(registry.byComponent).length + ' components');
  console.log('  ' + registry.stateCoverage.resolved + ' posts with resolved stateSlug');
  console.log('  State coverage by source:');
  for (const [source, count] of Object.entries(registry.stateCoverage.bySource)) {
    console.log(`    - ${source}: ${count}`);
  }
  if (registry.stateCoverage.unmappedHighIntent.length > 0) {
    console.log('  Unmapped high-intent posts:');
    for (const slug of registry.stateCoverage.unmappedHighIntent) console.log(`    - ${slug}`);
  }
}

main();
