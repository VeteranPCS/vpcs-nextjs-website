#!/usr/bin/env node
// Migrate Sanity blog documents to local MDX files.
//
// Run:
//   node --env-file=.env.local scripts/migrate-sanity-blogs-to-mdx.mjs [flags]
//
// Flags:
//   --dry-run               Don't write files; just log what would happen
//   --force                 Overwrite existing MDX + wipe per-blog image folder
//   --only=<slug>           Process only the matching slug
//   --limit=<n>             Process at most n blogs
//   --include-unpublished   Include blogs whose publishedAt is in the future
//
// Outputs:
//   content/blog/{slug}.mdx
//   public/images/blog/{slug}/main.{ext}
//   public/images/blog/{slug}/inline-{n}.{ext}

import { mkdirSync, writeFileSync, existsSync, rmSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), '..');

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SANITY_PROJECT_ID',
  'NEXT_PUBLIC_SANITY_DATASET',
  'NEXT_PUBLIC_SANITY_API_VERSION',
  'NEXT_PUBLIC_SANITY_API_TOKEN',
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing env var: ${key}`);
    console.error('Run with: node --env-file=.env.local scripts/migrate-sanity-blogs-to-mdx.mjs');
    process.exit(1);
  }
}

const args = parseArgs(process.argv.slice(2));
const log = (...parts) => console.log(...parts);

function parseArgs(argv) {
  const out = { dryRun: false, force: false, only: null, limit: null, includeUnpublished: false };
  for (const a of argv) {
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--force') out.force = true;
    else if (a === '--include-unpublished') out.includeUnpublished = true;
    else if (a.startsWith('--only=')) out.only = a.slice('--only='.length);
    else if (a.startsWith('--limit=')) out.limit = Number(a.slice('--limit='.length)) || null;
  }
  return out;
}

const SANITY = {
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
  token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
};

function sanityApiVersion() {
  const v = SANITY.apiVersion.startsWith('v') ? SANITY.apiVersion : `v${SANITY.apiVersion}`;
  return v;
}

async function sanityQuery(groq, params = {}) {
  const url = new URL(
    `https://${SANITY.projectId}.api.sanity.io/${sanityApiVersion()}/data/query/${SANITY.dataset}`,
  );
  url.searchParams.set('query', groq);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(`$${k}`, JSON.stringify(v));
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${SANITY.token}` },
  });
  if (!res.ok) {
    throw new Error(`Sanity ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.result;
}

async function downloadAsset(url, destAbs) {
  if (args.dryRun) {
    log(`    [dry] would download ${url} → ${destAbs}`);
    return;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Asset fetch failed (${res.status}): ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(destAbs), { recursive: true });
  writeFileSync(destAbs, buf);
}

function extFromAsset(asset) {
  if (!asset) return 'jpg';
  if (asset.extension) return asset.extension;
  if (asset.url) {
    const m = asset.url.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
    if (m) return m[1].toLowerCase();
  }
  return 'jpg';
}

const BLOG_QUERY = `
  *[_type == "blog" && defined(slug.current) __PUBLISHED__] {
    _id,
    title,
    short_title,
    meta_title,
    meta_description,
    "slug": slug.current,
    publishedAt,
    component,
    "componentSlug": component_slug.current,
    is_show,
    mainImage{ alt, "asset": asset->{ _id, url, extension, mimeType } },
    "categories": categories[]->{ title },
    content[] {
      ...,
      _type == "image" => { ..., alt, "asset": asset->{ _id, url, extension, mimeType } },
      _type == "block" => { ..., markDefs }
    },
    "author": author->{ _id, name, military_status, "slug": slug.current, location, brokerage, "image": image.asset->url }
  } | order(publishedAt desc)
`;

function buildSerializer(slug, baseImageDir, baseImageWebPath) {
  let imgCounter = 0;
  const seenAssets = new Map(); // _id → web path (dedup within post)
  const downloads = []; // { url, abs }

  function blockToMd(block) {
    const lines = block.children
      ?.map((child) => {
        if (child._type === 'span') {
          let text = child.text ?? '';
          const marks = child.marks ?? [];
          const linkDef = marks
            .map((m) => block.markDefs?.find((d) => d._key === m && d._type === 'link'))
            .find(Boolean);
          if (marks.includes('strong')) text = `**${text}**`;
          if (marks.includes('em')) text = `_${text}_`;
          if (linkDef?.href) text = `[${text}](${linkDef.href})`;
          return text;
        }
        return '';
      })
      .join('') ?? '';

    if (block.listItem === 'bullet') {
      const indent = '  '.repeat(Math.max(0, (block.level ?? 1) - 1));
      return `${indent}- ${lines}`;
    }
    if (block.listItem === 'number') {
      const indent = '  '.repeat(Math.max(0, (block.level ?? 1) - 1));
      return `${indent}1. ${lines}`;
    }

    switch (block.style) {
      case 'h1': return `# ${lines}`;
      case 'h2': return `## ${lines}`;
      case 'h3': return `### ${lines}`;
      case 'h4': return `#### ${lines}`;
      case 'blockquote': return `> ${lines}`;
      default: return lines;
    }
  }

  function imageToMd(node) {
    const assetId = node.asset?._id;
    if (assetId && seenAssets.has(assetId)) {
      const path = seenAssets.get(assetId);
      const alt = node.alt ?? '';
      return `![${alt}](${path})`;
    }
    imgCounter += 1;
    const ext = extFromAsset(node.asset);
    const filename = `inline-${imgCounter}.${ext}`;
    const abs = join(baseImageDir, filename);
    const web = `${baseImageWebPath}/${filename}`;
    if (assetId) seenAssets.set(assetId, web);
    if (node.asset?.url) downloads.push({ url: node.asset.url, abs });
    const alt = node.alt ?? '';
    return `![${alt}](${web})`;
  }

  function serialize(content) {
    if (!Array.isArray(content)) return '';
    const out = [];
    let inList = false;
    for (const node of content) {
      if (node._type === 'image') {
        if (inList) { out.push(''); inList = false; }
        out.push(imageToMd(node));
        out.push('');
        continue;
      }
      if (node._type === 'block') {
        const md = blockToMd(node);
        if (node.listItem) {
          out.push(md);
          inList = true;
        } else {
          if (inList) { out.push(''); inList = false; }
          out.push(md);
          out.push('');
        }
      }
    }
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  return { serialize, getDownloads: () => downloads, getInlineCount: () => imgCounter };
}

const authorByNameCache = new Map();
async function lookupAuthorSalesforceId(name) {
  if (!name) return null;
  if (authorByNameCache.has(name)) return authorByNameCache.get(name);
  const result = await sanityQuery(
    `*[_type == "agent" && lower(name) == lower($name)][0]{ salesforceID }`,
    { name },
  );
  const sfId = result?.salesforceID ?? null;
  authorByNameCache.set(name, sfId);
  return sfId;
}

async function processBlog(blog) {
  const slug = blog.slug;
  if (!slug) {
    log(`  [skip] blog ${blog._id}: missing slug`);
    return { processed: false, skipped: true };
  }
  if (args.only && slug !== args.only) {
    return { processed: false, skipped: true };
  }
  if (!args.includeUnpublished && blog.publishedAt && new Date(blog.publishedAt).getTime() > Date.now()) {
    log(`  [skip] ${slug}: future publishedAt (${blog.publishedAt})`);
    return { processed: false, skipped: true };
  }

  const mdxPath = join(ROOT, 'content', 'blog', `${slug}.mdx`);
  const blogImageDir = join(ROOT, 'public', 'images', 'blog', slug);
  const blogImageWebPath = `/images/blog/${slug}`;

  if (existsSync(mdxPath) && !args.force) {
    log(`  [skip] ${slug}: already exists (use --force to overwrite)`);
    return { processed: false, skipped: true };
  }

  if (args.force && existsSync(blogImageDir) && !args.dryRun) {
    rmSync(blogImageDir, { recursive: true, force: true });
  }

  if (!blog.mainImage?.asset?.url) {
    log(`  [warn] ${slug}: no mainImage — skipping`);
    return { processed: false, skipped: true };
  }

  const heroExt = extFromAsset(blog.mainImage.asset);
  const heroFilename = `main.${heroExt}`;
  const heroAbs = join(blogImageDir, heroFilename);
  const heroWeb = `${blogImageWebPath}/${heroFilename}`;

  await downloadAsset(blog.mainImage.asset.url, heroAbs);

  const serializer = buildSerializer(slug, blogImageDir, blogImageWebPath);
  const body = serializer.serialize(blog.content ?? []);
  for (const dl of serializer.getDownloads()) {
    await downloadAsset(dl.url, dl.abs);
  }

  let authorSfId = null;
  if (blog.author?.name) {
    try {
      authorSfId = await lookupAuthorSalesforceId(blog.author.name);
    } catch (err) {
      log(`  [warn] ${slug}: author lookup failed for "${blog.author.name}": ${err.message}`);
    }
  }

  const frontmatter = {
    title: blog.title ?? '',
    ...(blog.short_title ? { shortTitle: blog.short_title } : {}),
    metaTitle: blog.meta_title ?? blog.title ?? '',
    metaDescription: blog.meta_description ?? '',
    slug,
    publishedAt: blog.publishedAt ?? new Date().toISOString(),
    component: blog.component ?? 'Uncategorized',
    ...(blog.componentSlug ? { componentSlug: blog.componentSlug } : {}),
    categories: (blog.categories ?? []).map((c) => c?.title).filter(Boolean),
    mainImage: {
      src: heroWeb,
      alt: blog.mainImage.alt ?? blog.title ?? '',
    },
    author: {
      ...(authorSfId ? { salesforceId: authorSfId } : {}),
      ...(blog.author?.name ? { name: blog.author.name } : {}),
    },
    sanityId: blog._id,
  };

  const file = matter.stringify(body, frontmatter);

  if (args.dryRun) {
    log(`  [dry] ${slug}: would write ${mdxPath} (${file.length} bytes, ${serializer.getInlineCount()} inline images)`);
    return { processed: true, skipped: false, sfMatched: !!authorSfId, inlineImages: serializer.getInlineCount() };
  }

  mkdirSync(dirname(mdxPath), { recursive: true });
  const tmp = `${mdxPath}.tmp`;
  writeFileSync(tmp, file, 'utf-8');
  renameSync(tmp, mdxPath);
  log(`  [ok]   ${slug}: hero + ${serializer.getInlineCount()} inline images, SF id=${authorSfId ? 'yes' : 'no'}`);
  return { processed: true, skipped: false, sfMatched: !!authorSfId, inlineImages: serializer.getInlineCount() };
}

async function main() {
  log('═══ Sanity Blog → MDX Migration ═══');
  log(`Mode: ${args.dryRun ? 'DRY RUN' : 'WRITE'}, force=${args.force}, only=${args.only ?? '(all)'}, limit=${args.limit ?? '(all)'}, includeUnpublished=${args.includeUnpublished}`);
  log('');

  const groq = BLOG_QUERY.replace(
    '__PUBLISHED__',
    args.includeUnpublished ? '' : '&& publishedAt <= now()',
  );

  log('Fetching blogs from Sanity...');
  const blogs = await sanityQuery(groq);
  log(`  → ${blogs.length} blogs fetched`);
  log('');

  const subset = args.limit ? blogs.slice(0, args.limit) : blogs;

  let processed = 0;
  let skipped = 0;
  let sfMatched = 0;
  let totalInline = 0;

  for (const blog of subset) {
    const result = await processBlog(blog);
    if (result.processed) {
      processed += 1;
      if (result.sfMatched) sfMatched += 1;
      totalInline += result.inlineImages ?? 0;
    } else {
      skipped += 1;
    }
  }

  log('');
  log('═══ Summary ═══');
  log(`  Processed:        ${processed}`);
  log(`  Skipped:          ${skipped}`);
  log(`  With SF ID:       ${sfMatched}`);
  log(`  Without SF ID:    ${processed - sfMatched}`);
  log(`  Total inline imgs: ${totalInline}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
