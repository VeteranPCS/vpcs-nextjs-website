#!/usr/bin/env node
// Read-only recon for the blog migration. Compares Sanity-side state to
// content/blog/*.mdx + public/images/blog/* + public/images/{agents,lenders}/.
//
// Run:
//   node --env-file=.env.local scripts/recon-blog-migration.mjs [--strict]
//
// Outputs:
//   docs/blog-migration/recon-{ISO}.md          (committed)
//   docs/blog-migration/raw/*.json              (gitignored)

import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
  statSync,
} from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), '..');

const args = { strict: process.argv.includes('--strict') };

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SANITY_PROJECT_ID',
  'NEXT_PUBLIC_SANITY_DATASET',
  'NEXT_PUBLIC_SANITY_API_VERSION',
  'NEXT_PUBLIC_SANITY_API_TOKEN',
];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing env var: ${key}`);
    process.exit(1);
  }
}

const SANITY = {
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
  token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
};

async function sanityQuery(groq) {
  const apiVersion = SANITY.apiVersion.startsWith('v') ? SANITY.apiVersion : `v${SANITY.apiVersion}`;
  const url = new URL(
    `https://${SANITY.projectId}.api.sanity.io/${apiVersion}/data/query/${SANITY.dataset}`,
  );
  url.searchParams.set('query', groq);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${SANITY.token}` } });
  if (!res.ok) throw new Error(`Sanity ${res.status}: ${await res.text()}`);
  return (await res.json()).result;
}

const REQUIRED_FRONTMATTER_KEYS = [
  'title', 'metaTitle', 'metaDescription', 'slug', 'publishedAt',
  'component', 'categories', 'mainImage', 'author',
];

function readMdxFiles() {
  const dir = join(ROOT, 'content', 'blog');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.mdx'))
    .map((filename) => {
      const filepath = join(dir, filename);
      const raw = readFileSync(filepath, 'utf-8');
      const { data, content } = matter(raw);
      return { filename, filepath, data, content };
    });
}

function inlineImageRefsFromMdx(content) {
  const refs = [];
  const re = /!\[[^\]]*\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    refs.push(m[1]);
  }
  return refs;
}

async function main() {
  const issues = [];
  const report = [];
  const RAW_DIR = join(ROOT, 'docs', 'blog-migration', 'raw');
  const REPORT_DIR = join(ROOT, 'docs', 'blog-migration');
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(REPORT_DIR, { recursive: true });

  report.push('# Blog Migration Recon');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push('');

  // 1. Parity: Sanity blogs vs MDX files
  console.log('Fetching Sanity blogs...');
  const sanityBlogs = await sanityQuery(`
    *[_type == "blog" && defined(slug.current) && publishedAt <= now()]{
      _id, title, "slug": slug.current, publishedAt, component,
      "inlineImageCount": count(content[_type == "image"]),
      "hasMainImage": defined(mainImage.asset),
      "authorName": author->name
    } | order(publishedAt desc)
  `);
  writeFileSync(join(RAW_DIR, 'sanity-blogs.json'), JSON.stringify(sanityBlogs, null, 2));

  const mdxFiles = readMdxFiles();
  writeFileSync(
    join(RAW_DIR, 'mdx-files.json'),
    JSON.stringify(mdxFiles.map((f) => ({ filename: f.filename, slug: f.data?.slug })), null, 2),
  );

  const sanitySlugs = new Set(sanityBlogs.map((b) => b.slug));
  const mdxSlugs = new Set(mdxFiles.map((f) => f.data?.slug).filter(Boolean));

  report.push('## 1. Blog Count Parity');
  report.push('');
  report.push(`- Sanity (published): **${sanitySlugs.size}**`);
  report.push(`- MDX files:          **${mdxSlugs.size}**`);
  report.push('');

  const missingFromMdx = [...sanitySlugs].filter((s) => !mdxSlugs.has(s));
  const missingFromSanity = [...mdxSlugs].filter((s) => !sanitySlugs.has(s));
  if (missingFromMdx.length) {
    issues.push(`${missingFromMdx.length} Sanity blog(s) not yet in content/blog/`);
    report.push('### Sanity blogs missing in content/blog/');
    for (const s of missingFromMdx) report.push(`- ${s}`);
    report.push('');
  }
  if (missingFromSanity.length) {
    report.push('### MDX files with no Sanity equivalent');
    for (const s of missingFromSanity) report.push(`- ${s}`);
    report.push('');
  }

  // 2. Frontmatter validation
  report.push('## 2. Frontmatter Validation');
  report.push('');
  const frontmatterErrors = [];
  for (const f of mdxFiles) {
    const fm = f.data ?? {};
    const expected = basename(f.filename, '.mdx');
    if (fm.slug !== expected) {
      frontmatterErrors.push(`${f.filename}: slug "${fm.slug}" != filename`);
    }
    for (const key of REQUIRED_FRONTMATTER_KEYS) {
      if (fm[key] === undefined || fm[key] === null || fm[key] === '') {
        frontmatterErrors.push(`${f.filename}: missing or empty "${key}"`);
      }
    }
    if (fm.mainImage && !fm.mainImage.src) {
      frontmatterErrors.push(`${f.filename}: mainImage has no src`);
    }
  }
  if (frontmatterErrors.length) {
    issues.push(`${frontmatterErrors.length} frontmatter error(s)`);
    for (const e of frontmatterErrors) report.push(`- ${e}`);
  } else {
    report.push('All frontmatter looks good.');
  }
  report.push('');

  // 3. Hero image parity
  report.push('## 3. Hero Image Parity');
  report.push('');
  const heroMissing = [];
  for (const f of mdxFiles) {
    const src = f.data?.mainImage?.src;
    if (!src) continue;
    const abs = join(ROOT, 'public', src.startsWith('/') ? src.slice(1) : src);
    if (!existsSync(abs)) heroMissing.push(`${f.filename}: ${src} (not found)`);
  }
  if (heroMissing.length) {
    issues.push(`${heroMissing.length} hero image(s) missing`);
    for (const e of heroMissing) report.push(`- ${e}`);
  } else {
    report.push(`All ${mdxFiles.length} hero images resolved.`);
  }
  report.push('');

  // 4. Inline image parity
  report.push('## 4. Inline Image Parity');
  report.push('');
  const inlineIssues = [];
  const sanityInlineCounts = new Map(sanityBlogs.map((b) => [b.slug, b.inlineImageCount ?? 0]));
  for (const f of mdxFiles) {
    const slug = f.data?.slug;
    const refs = inlineImageRefsFromMdx(f.content);
    const internalRefs = refs.filter((r) => r.startsWith('/'));
    const missing = internalRefs.filter((r) => !existsSync(join(ROOT, 'public', r.slice(1))));
    if (missing.length) {
      inlineIssues.push(`${slug}: ${missing.length} broken ref(s) - ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ', ...' : ''}`);
    }
    const expected = sanityInlineCounts.get(slug);
    if (expected !== undefined && internalRefs.length !== expected) {
      inlineIssues.push(`${slug}: inline count mismatch (mdx=${internalRefs.length}, sanity=${expected})`);
    }
  }
  if (inlineIssues.length) {
    issues.push(`${inlineIssues.length} inline image issue(s)`);
    for (const e of inlineIssues) report.push(`- ${e}`);
  } else {
    report.push('All inline images accounted for.');
  }
  report.push('');

  // 5. Orphan image scan
  report.push('## 5. Orphan Images in public/images/blog/');
  report.push('');
  const orphans = [];
  const blogImagesRoot = join(ROOT, 'public', 'images', 'blog');
  if (existsSync(blogImagesRoot)) {
    for (const slugDir of readdirSync(blogImagesRoot)) {
      const dirAbs = join(blogImagesRoot, slugDir);
      if (!statSync(dirAbs).isDirectory()) continue;
      const mdx = mdxFiles.find((f) => f.data?.slug === slugDir);
      if (!mdx) {
        orphans.push(`public/images/blog/${slugDir}/ has no matching MDX file`);
        continue;
      }
      const expectedHero = mdx.data?.mainImage?.src;
      const inlineRefs = new Set(inlineImageRefsFromMdx(mdx.content));
      for (const file of readdirSync(dirAbs)) {
        const webPath = `/images/blog/${slugDir}/${file}`;
        if (webPath === expectedHero) continue;
        if (inlineRefs.has(webPath)) continue;
        orphans.push(webPath);
      }
    }
  }
  if (orphans.length) {
    for (const o of orphans) report.push(`- ${o}`);
  } else {
    report.push('No orphan images.');
  }
  report.push('');

  // 6. Author resolvability
  report.push('## 6. Author Frontmatter');
  report.push('');
  const byId = [];
  const byNameOnly = [];
  const noAuthor = [];
  for (const f of mdxFiles) {
    const a = f.data?.author ?? {};
    if (a.salesforceId) byId.push(f.data.slug);
    else if (a.name) byNameOnly.push(`${f.data.slug} -> "${a.name}"`);
    else noAuthor.push(f.data.slug);
  }
  report.push(`- With Salesforce ID: ${byId.length}`);
  report.push(`- Name only:          ${byNameOnly.length}`);
  report.push(`- No author:          ${noAuthor.length}`);
  if (byNameOnly.length) {
    report.push('');
    report.push('### Name-only authors (will fall back to bare-name byline)');
    for (const s of byNameOnly) report.push(`- ${s}`);
  }
  if (noAuthor.length) {
    issues.push(`${noAuthor.length} blog(s) with no author frontmatter`);
    report.push('');
    report.push('### Blogs with no author');
    for (const s of noAuthor) report.push(`- ${s}`);
  }
  report.push('');

  // 7. Agent / lender image presence
  report.push('## 7. Agent/Lender Image Presence');
  report.push('');
  const sfIds = [...new Set(mdxFiles.map((f) => f.data?.author?.salesforceId).filter(Boolean))];
  const sfMissing = [];
  for (const id of sfIds) {
    const found = ['agents', 'lenders'].some((folder) =>
      ['jpg', 'jpeg', 'png', 'webp'].some((ext) =>
        existsSync(join(ROOT, 'public', 'images', folder, `${id}.${ext}`)),
      ),
    );
    if (!found) sfMissing.push(id);
  }
  report.push(`- Distinct SF IDs:  ${sfIds.length}`);
  report.push(`- Missing local image: ${sfMissing.length}`);
  if (sfMissing.length) {
    issues.push(`${sfMissing.length} author SF ID(s) missing local headshot`);
    for (const id of sfMissing) report.push(`- ${id}`);
  }
  report.push('');

  // 8. Component value drift
  report.push('## 8. Component Values');
  report.push('');
  const fsComponents = [...new Set(mdxFiles.map((f) => f.data?.component).filter(Boolean))].sort();
  const sanityComponents = [...new Set(sanityBlogs.map((b) => b.component).filter(Boolean))].sort();
  report.push(`- Distinct in MDX:    ${fsComponents.join(', ') || '(none)'}`);
  report.push(`- Distinct in Sanity: ${sanityComponents.join(', ') || '(none)'}`);
  const onlyFs = fsComponents.filter((c) => !sanityComponents.includes(c));
  const onlySanity = sanityComponents.filter((c) => !fsComponents.includes(c));
  if (onlyFs.length) report.push(`- Only in MDX: ${onlyFs.join(', ')}`);
  if (onlySanity.length) report.push(`- Only in Sanity: ${onlySanity.join(', ')}`);
  report.push('');

  // 9. Summary header
  report.unshift('');
  report.unshift(issues.length ? `**${issues.length} issue(s) found.** See details below.` : '**All clean.**');
  report.unshift('');

  const reportPath = join(REPORT_DIR, `recon-${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(reportPath, report.join('\n'));
  console.log(`\nReport written: ${reportPath}`);
  console.log(`Issues: ${issues.length}`);
  for (const i of issues) console.log(`  - ${i}`);
  if (args.strict && issues.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
