// Public, literal paths only: unknown/free-text routes must not enter attribution.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function journeyPaths() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const registry = JSON.parse(readFileSync(resolve(root, 'content/_registry/internal-links.json'), 'utf8'));
  const states = JSON.parse(readFileSync(resolve(root, 'content/_data/us-states.json'), 'utf8'));
  const pages = readdirSync(resolve(root, 'app/(site)'), { recursive: true })
    .map(String).filter((p) => (p === 'page.tsx' || p.endsWith('/page.tsx')) && !p.includes('['))
    .map((p) => '/' + p.replace(/(^|\/)page\.tsx$/, ''));
  return [...new Set([...pages, ...states.map((s) => '/' + s.slug),
    ...registry.posts.map((p) => '/blog/' + p.slug),
    ...registry.posts.filter((p) => p.componentSlug).map((p) => '/blog/category/' + p.componentSlug),
  ])].sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(new URL('../content/_registry/journey-paths.json', import.meta.url), JSON.stringify(journeyPaths(), null, 2) + '\n');
}
