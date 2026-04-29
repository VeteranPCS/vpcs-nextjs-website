#!/usr/bin/env node
// Build a slim JSON registry of every blog post for internal-link discovery.
// Consumers (the vpcs-blog skill, freshness pipeline, GSC report joiner) can
// read this without booting Next or re-walking content/blog.
//
// Run:
//   node scripts/build-internal-link-registry.mjs
//
// Output:
//   content/_registry/internal-links.json (committed)
//
// Each post entry contains: slug, title, url, component, description,
// publishedAt, updatedAt, primaryKeyword, secondaryKeywords, h2Outline.

import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

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
  return {
    slug: post.slug,
    title: typeof fm.title === 'string' ? fm.title : post.slug,
    url: '/blog/' + post.slug,
    component: typeof fm.component === 'string' ? fm.component : null,
    description: shortDescription(fm, post.content),
    publishedAt: fm.publishedAt ?? null,
    updatedAt: fm.updatedAt ?? null,
    primaryKeyword: fm.primaryKeyword ?? null,
    secondaryKeywords: Array.isArray(fm.secondaryKeywords) ? fm.secondaryKeywords : [],
    h2Outline: extractH2Outline(post.content),
  };
}

function groupByComponent(entries) {
  const grouped = {};
  for (const entry of entries) {
    const key = entry.component ?? '(uncategorized)';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(entry.slug);
  }
  for (const key of Object.keys(grouped)) grouped[key].sort();
  return grouped;
}

function main() {
  const posts = readPosts();
  const entries = posts.map(buildEntry);
  entries.sort((a, b) => a.slug.localeCompare(b.slug));

  const registry = {
    generatedAt: new Date().toISOString(),
    totalPosts: entries.length,
    byComponent: groupByComponent(entries),
    posts: entries,
  };

  mkdirSync(REGISTRY_DIR, { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(registry, null, 2) + '\n');
  console.log('Wrote ' + OUT_PATH);
  console.log('  ' + entries.length + ' posts across ' + Object.keys(registry.byComponent).length + ' components');
}

main();
