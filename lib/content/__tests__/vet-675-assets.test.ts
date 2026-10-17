import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import manifest from '@/docs/design/steph/vet-675-assets.json';

it('delivers decodable assets with preserved ratios and no designer-local SVG dependencies', async () => {
  expect(manifest.assets).toHaveLength(44);
  expect(new Set(manifest.assets.map(asset => asset.id)).size).toBe(44);
  for (const asset of manifest.assets) {
    expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/);
    if (!asset.deployedPath) continue;
    const path = join(process.cwd(), 'public', asset.deployedPath);
    expect(existsSync(path), asset.deployedPath).toBe(true);
    const bytes=readFileSync(path);
    expect(bytes.byteLength).toBe(asset.deployedBytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.deployedSha256);
    const image = await sharp(path).metadata();
    expect(image.width).toBe(asset.deployedWidth);
    expect(image.height).toBe(asset.deployedHeight);
    // Raster resizing can round either dimension by one pixel.
    expect(Math.abs((image.width ?? 0) * asset.height / asset.width - (image.height ?? 0))).toBeLessThanOrEqual(1);
    if (path.endsWith('.svg')) {
      expect(readFileSync(path, 'utf8')).not.toMatch(/(?:href|src)=["'](?:file:|https?:|\.\.\/|[A-Z]:\\)/i);
    }
  }
  expect(manifest.assets.filter(asset => asset.status.startsWith('unusable')).map(asset => asset.title).sort()).toEqual(['Asset 12.svg', 'guides.svg']);
});
