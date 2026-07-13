import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import {
  EXPECTED_COUNTS,
  LIVE_TYPES,
  assetIdParts,
  assignUniquePaths,
  buildMaterializedUrl,
  cleanDoc,
  collectImageOccurrences,
  collectRefs,
  deriveImageFilename,
  diffIdRevMaps,
  docSlugOrId,
  extFromContentType,
  extFromUrl,
  extsEquivalent,
  hasMeaningfulCropOrHotspot,
  imageAssetIdOf,
  isCdnSanitizedSvgAcceptable,
  isDefaultHotspot,
  isImageAssetId,
  isImageObject,
  isPortableTextArray,
  kebabCase,
  looksLikeSvg,
  manifestsEquivalent,
  parseArgs,
  readGifDimensions,
  readImageDimensions,
  readJpegDimensions,
  readPngDimensions,
  readWebpDimensions,
  sha1Hex,
  sha256Hex,
  shortHash,
  slugify,
  sortKeysDeep,
  stableStringify,
  stripExtension,
  verifyRawAssetBytes,
} from '../export-sanity-content.mjs';

describe('constants', () => {
  it('covers all 25 live document types', () => {
    expect(LIVE_TYPES).toHaveLength(25);
    expect(LIVE_TYPES).toContain('state_list');
    expect(LIVE_TYPES).toContain('aboutSupportComponent');
    for (const count of Object.values(EXPECTED_COUNTS)) {
      expect(count).toBeGreaterThan(0);
    }
  });
});

describe('parseArgs', () => {
  it('parses the supported flags', () => {
    expect(parseArgs([])).toEqual({ dryRun: false, force: false, check: false, allowWarn: false });
    expect(parseArgs(['--dry-run', '--allow-warn'])).toMatchObject({ dryRun: true, allowWarn: true });
    expect(parseArgs(['--force'])).toMatchObject({ force: true });
    expect(parseArgs(['--check'])).toMatchObject({ check: true });
  });
});

describe('kebabCase', () => {
  it('converts snake_case and camelCase type names to kebab-case sections', () => {
    expect(kebabCase('member_info')).toBe('member-info');
    expect(kebabCase('real_state_agents')).toBe('real-state-agents');
    expect(kebabCase('additionalSuccessStories')).toBe('additional-success-stories');
    expect(kebabCase('aboutUsPage')).toBe('about-us-page');
    expect(kebabCase('moveInBonus')).toBe('move-in-bonus');
    expect(kebabCase('state_list')).toBe('state-list');
  });
});

describe('slugify', () => {
  it('lowercases, strips diacritics, and collapses non-alphanumerics', () => {
    expect(slugify('Fort Bragg HQ photo (final).PNG')).toBe('fort-bragg-hq-photo-final-png');
    expect(slugify('José María')).toBe('jose-maria');
    expect(slugify('  --hello__world--  ')).toBe('hello-world');
    expect(slugify('')).toBe('');
    expect(slugify(null)).toBe('');
  });
});

describe('shortHash', () => {
  it('is deterministic and 8 hex chars', () => {
    expect(shortHash('image-abc-100x100-png')).toBe(shortHash('image-abc-100x100-png'));
    expect(shortHash('a')).not.toBe(shortHash('b'));
    expect(shortHash('anything')).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('filename/extension helpers', () => {
  it('stripExtension removes only a short trailing extension', () => {
    expect(stripExtension('photo.jpg')).toBe('photo');
    expect(stripExtension('archive.tar.gz')).toBe('archive.tar');
    expect(stripExtension('no-extension')).toBe('no-extension');
    expect(stripExtension('weird.thisistoolong')).toBe('weird.thisistoolong');
  });

  it('extFromUrl reads the extension off a CDN URL', () => {
    expect(extFromUrl('https://cdn.sanity.io/images/p/d/abc-100x100.PNG?rect=1')).toBe('png');
    expect(extFromUrl('https://example.com/no-ext')).toBeNull();
  });

  it('extFromContentType maps MIME types, extsEquivalent treats jpg/jpeg as equal', () => {
    expect(extFromContentType('image/jpeg')).toBe('jpg');
    expect(extFromContentType('image/webp; charset=binary')).toBe('webp');
    expect(extFromContentType('text/html')).toBeNull();
    expect(extsEquivalent('jpg', 'jpeg')).toBe(true);
    expect(extsEquivalent('png', 'webp')).toBe(false);
  });
});

describe('isDefaultHotspot / hasMeaningfulCropOrHotspot', () => {
  const defaultHotspot = { x: 0.5, y: 0.5, width: 1, height: 1 };

  it('isDefaultHotspot recognizes the Studio default (with float tolerance)', () => {
    expect(isDefaultHotspot(defaultHotspot)).toBe(true);
    expect(isDefaultHotspot({ x: 0.5000000001, y: 0.5, width: 0.9999999999, height: 1 })).toBe(true);
    expect(isDefaultHotspot({ x: 0.3, y: 0.5, width: 1, height: 1 })).toBe(false);
    expect(isDefaultHotspot({ x: 0.5, y: 0.5, width: 0.4, height: 0.4 })).toBe(false);
    expect(isDefaultHotspot(null)).toBe(false);
    expect(isDefaultHotspot({})).toBe(false);
  });

  it('is false for missing or all-zero crop with no hotspot', () => {
    expect(hasMeaningfulCropOrHotspot({})).toBe(false);
    expect(
      hasMeaningfulCropOrHotspot({ crop: { top: 0, bottom: 0, left: 0, right: 0 } }),
    ).toBe(false);
  });

  it('is false for the default full-frame hotspot (a no-op transform)', () => {
    expect(hasMeaningfulCropOrHotspot({ hotspot: defaultHotspot })).toBe(false);
    expect(
      hasMeaningfulCropOrHotspot({
        crop: { top: 0, bottom: 0, left: 0, right: 0 },
        hotspot: defaultHotspot,
      }),
    ).toBe(false);
  });

  it('is true for a real crop or a non-default hotspot', () => {
    expect(
      hasMeaningfulCropOrHotspot({ crop: { top: 0.12, bottom: 0, left: 0, right: 0 } }),
    ).toBe(true);
    expect(
      hasMeaningfulCropOrHotspot({ hotspot: { x: 0.5, y: 0.5, width: 0.4, height: 0.4 } }),
    ).toBe(true);
    expect(
      hasMeaningfulCropOrHotspot({ hotspot: { x: 0.3, y: 0.7, width: 1, height: 1 } }),
    ).toBe(true);
    // real crop wins even alongside a default hotspot
    expect(
      hasMeaningfulCropOrHotspot({
        crop: { top: 0.05, bottom: 0, left: 0, right: 0 },
        hotspot: defaultHotspot,
      }),
    ).toBe(true);
  });
});

describe('image object detection', () => {
  const refImage = { _type: 'image', asset: { _ref: 'image-abc123-800x600-png', _type: 'reference' } };
  const derefImage = { _type: 'image', asset: { _id: 'image-def456-100x100-jpg', url: 'https://cdn' } };

  it('detects both _ref and dereferenced asset shapes', () => {
    expect(isImageObject(refImage)).toBe(true);
    expect(isImageObject(derefImage)).toBe(true);
    expect(imageAssetIdOf(refImage)).toBe('image-abc123-800x600-png');
    expect(imageAssetIdOf(derefImage)).toBe('image-def456-100x100-jpg');
  });

  it('rejects non-image nodes', () => {
    expect(isImageObject({ asset: { _ref: 'file-abc-pdf' } })).toBe(false);
    expect(isImageObject({ _ref: 'image-abc-1x1-png' })).toBe(false);
    expect(isImageObject(null)).toBe(false);
    expect(isImageObject([refImage])).toBe(false);
    expect(isImageAssetId('file-abc-pdf')).toBe(false);
    expect(isImageAssetId('image-abc-1x1-png')).toBe(true);
  });
});

describe('isPortableTextArray', () => {
  it('detects arrays containing block items', () => {
    expect(isPortableTextArray([{ _type: 'block', children: [] }])).toBe(true);
    expect(isPortableTextArray([{ _type: 'image' }, { _type: 'block' }])).toBe(true);
    expect(isPortableTextArray([{ _type: 'image' }])).toBe(false);
    expect(isPortableTextArray([])).toBe(false);
    expect(isPortableTextArray('not an array')).toBe(false);
  });
});

describe('collectImageOccurrences', () => {
  it('finds nested images with field paths and flags Portable Text ones', () => {
    const doc = {
      _id: 'doc1',
      _type: 'state_list',
      state_map: { _type: 'image', asset: { _ref: 'image-map-10x10-png' }, alt: 'Texas map' },
      sections: [
        { title: 'a', logo: { _type: 'image', asset: { _ref: 'image-logo-5x5-jpg' } } },
      ],
      body: [
        { _type: 'block', children: [{ _type: 'span', text: 'hi' }] },
        { _type: 'image', asset: { _ref: 'image-inline-2x2-png' } },
      ],
    };
    const occ = collectImageOccurrences(doc);
    expect(occ).toHaveLength(3);
    const byPath = new Map(occ.map((o: { fieldPath: string }) => [o.fieldPath, o]));
    expect(byPath.get('state_map')).toMatchObject({ inPortableText: false });
    expect(byPath.get('sections[0].logo')).toMatchObject({ inPortableText: false });
    expect(byPath.get('body[1]')).toMatchObject({ inPortableText: true });
  });

  it('does not descend into the asset of a detected image', () => {
    const doc = { img: { asset: { _ref: 'image-a-1x1-png', nested: { asset: { _ref: 'image-b-1x1-png' } } } } };
    expect(collectImageOccurrences(doc)).toHaveLength(1);
  });
});

describe('collectRefs', () => {
  it('collects every _ref with its path', () => {
    const doc = {
      _id: 'doc1',
      img: { asset: { _ref: 'image-a-1x1-png' } },
      related: { _ref: 'someDocId', _type: 'reference' },
      list: [{ item: { _ref: 'otherDocId' } }],
    };
    const refs = collectRefs(doc);
    expect(refs).toHaveLength(3);
    expect(refs.map((r: { ref: string }) => r.ref).sort()).toEqual([
      'image-a-1x1-png',
      'otherDocId',
      'someDocId',
    ]);
    expect(refs.find((r: { ref: string }) => r.ref === 'otherDocId')).toMatchObject({
      fieldPath: 'list[0].item',
    });
  });
});

describe('cleanDoc / sortKeysDeep / stableStringify', () => {
  it('drops _rev and _system and keeps everything else', () => {
    const doc = {
      _id: 'x',
      _rev: 'abc',
      _system: { base: { id: 'x', rev: 'abc' } },
      _type: 't',
      title: 'hi',
    };
    const cleaned = cleanDoc(doc);
    expect(cleaned).toEqual({ _id: 'x', _type: 't', title: 'hi' });
    expect(cleaned).not.toHaveProperty('_rev');
    expect(cleaned).not.toHaveProperty('_system');
  });

  it('orders system keys first, the rest alphabetically, recursively', () => {
    const out = stableStringify({
      zebra: 1,
      _type: 't',
      alpha: { c: 1, b: { _id: 'nested', a: 2 } },
      _id: 'x',
    });
    const keys = out.match(/"(\w+)":/g);
    expect(out.startsWith('{\n  "_id": "x",\n  "_type": "t",')).toBe(true);
    expect(keys).toBeTruthy();
    expect(out.indexOf('"alpha"')).toBeLessThan(out.indexOf('"zebra"'));
    expect(out.endsWith('\n')).toBe(true);
  });

  it('leaves Portable Text block arrays verbatim (no key reordering)', () => {
    const block = { children: [{ text: 'hi', _type: 'span' }], _type: 'block', style: 'normal' };
    const sorted = sortKeysDeep({ body: [block] }) as { body: unknown[] };
    expect(sorted.body[0]).toBe(block); // same reference, untouched
    expect(Object.keys(sorted.body[0] as object)).toEqual(['children', '_type', 'style']);
  });

  it('is deterministic regardless of input key order', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
  });
});

describe('docSlugOrId / deriveImageFilename', () => {
  const doc = { _id: 'abc-123', state_slug: { current: 'texas' } };

  it('prefers state_slug, then slug, then _id', () => {
    expect(docSlugOrId(doc)).toBe('texas');
    expect(docSlugOrId({ _id: 'x', slug: { current: 'my-slug' } })).toBe('my-slug');
    expect(docSlugOrId({ _id: 'only-id' })).toBe('only-id');
  });

  it('slugifies originalFilename and keeps the asset extension', () => {
    const asset = { originalFilename: 'Team Photo (2024).JPG', extension: 'jpg', url: 'https://cdn/x.jpg' };
    expect(deriveImageFilename({ asset, doc, fieldPath: 'photo' })).toBe('team-photo-2024.jpg');
  });

  it('falls back to <docSlugOrId>-<fieldPath>.<ext> when originalFilename is missing', () => {
    const asset = { originalFilename: undefined, extension: 'png', url: 'https://cdn/x.png' };
    expect(deriveImageFilename({ asset, doc, fieldPath: 'sections[0].logo' })).toBe(
      'texas-sections-0-logo.png',
    );
  });
});

describe('assignUniquePaths', () => {
  it('gives distinct assets colliding on a filename a short-hash suffix', () => {
    const items = [
      { unitKey: 'image-aaa|raw|/images/content/x/logo.png', dir: '/images/content/x', filename: 'logo.png' },
      { unitKey: 'image-bbb|raw|/images/content/x/logo.png', dir: '/images/content/x', filename: 'logo.png' },
    ];
    const result = assignUniquePaths(items);
    const paths = [...result.values()];
    expect(new Set(paths).size).toBe(2);
    expect(paths).toContain('/images/content/x/logo.png');
    const suffixed = paths.find((p) => p !== '/images/content/x/logo.png');
    expect(suffixed).toMatch(/^\/images\/content\/x\/logo-[0-9a-f]{8}\.png$/);
  });

  it('reuses one path for repeated occurrences of the same unit', () => {
    const item = { unitKey: 'image-aaa|raw|/images/states/texas.png', dir: '/images/states', filename: 'texas.png' };
    const result = assignUniquePaths([item, { ...item }]);
    expect(result.size).toBe(1);
    expect(result.get(item.unitKey)).toBe('/images/states/texas.png');
  });

  it('is deterministic regardless of input order', () => {
    const a = { unitKey: 'k-a', dir: '/d', filename: 'f.png' };
    const b = { unitKey: 'k-b', dir: '/d', filename: 'f.png' };
    expect([...assignUniquePaths([a, b]).entries()]).toEqual([...assignUniquePaths([b, a]).entries()]);
  });
});

describe('buildMaterializedUrl', () => {
  it('builds the app-identical rendered URL (rect from crop, fit=max, auto=format)', () => {
    const url = buildMaterializedUrl(
      {
        _type: 'image',
        asset: { _ref: 'image-deadbeef-100x200-png' },
        crop: { top: 0.1, bottom: 0.1, left: 0, right: 0 },
        hotspot: { x: 0.5, y: 0.5, width: 0.4, height: 0.4 },
      },
      { projectId: 'testproj', dataset: 'production' },
    );
    expect(url).toContain('https://cdn.sanity.io/images/testproj/production/deadbeef-100x200.png');
    expect(url).toContain('rect=0,20,100,160');
    expect(url).toContain('fit=max');
    expect(url).toContain('auto=format');
  });
});

// ── Image header parsers ─────────────────────────────────────────────────────

function pngFixture(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24);
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  sig.forEach((b, i) => buf.writeUInt8(b, i));
  buf.write('IHDR', 12, 'ascii');
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

function gifFixture(width: number, height: number): Buffer {
  const buf = Buffer.alloc(10);
  buf.write('GIF89a', 0, 'ascii');
  buf.writeUInt16LE(width, 6);
  buf.writeUInt16LE(height, 8);
  return buf;
}

function jpegFixture(width: number, height: number): Buffer {
  // SOI, APP0 segment (skipped), SOF0 with dimensions
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x04, 0x00, 0x00]);
  const sof0 = Buffer.alloc(11);
  sof0.writeUInt8(0xff, 0);
  sof0.writeUInt8(0xc0, 1);
  sof0.writeUInt16BE(0x0011, 2); // segment length
  sof0.writeUInt8(8, 4); // precision
  sof0.writeUInt16BE(height, 5);
  sof0.writeUInt16BE(width, 7);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof0, Buffer.alloc(8)]);
}

function webpLossyFixture(width: number, height: number): Buffer {
  const buf = Buffer.alloc(30);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(22, 4);
  buf.write('WEBP', 8, 'ascii');
  buf.write('VP8 ', 12, 'ascii');
  buf.writeUInt32LE(10, 16);
  buf.writeUInt8(0x9d, 23);
  buf.writeUInt8(0x01, 24);
  buf.writeUInt8(0x2a, 25);
  buf.writeUInt16LE(width, 26);
  buf.writeUInt16LE(height, 28);
  return buf;
}

function webpLosslessFixture(width: number, height: number): Buffer {
  const buf = Buffer.alloc(30);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(22, 4);
  buf.write('WEBP', 8, 'ascii');
  buf.write('VP8L', 12, 'ascii');
  buf.writeUInt32LE(10, 16);
  buf.writeUInt8(0x2f, 20);
  const bits = (width - 1) | ((height - 1) << 14);
  buf.writeUInt32LE(bits >>> 0, 21);
  return buf;
}

function webpExtendedFixture(width: number, height: number): Buffer {
  const buf = Buffer.alloc(30);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(22, 4);
  buf.write('WEBP', 8, 'ascii');
  buf.write('VP8X', 12, 'ascii');
  buf.writeUInt32LE(10, 16);
  buf.writeUIntLE(width - 1, 24, 3);
  buf.writeUIntLE(height - 1, 27, 3);
  return buf;
}

describe('image dimension readers', () => {
  it('reads PNG IHDR dimensions', () => {
    expect(readPngDimensions(pngFixture(640, 480))).toEqual({ width: 640, height: 480 });
    expect(readPngDimensions(Buffer.from('not a png, definitely'))).toBeNull();
  });

  it('reads GIF logical screen dimensions', () => {
    expect(readGifDimensions(gifFixture(320, 200))).toEqual({ width: 320, height: 200 });
    expect(readGifDimensions(Buffer.from('GIF7 nope 12345'))).toBeNull();
  });

  it('reads JPEG SOF dimensions, skipping earlier segments', () => {
    expect(readJpegDimensions(jpegFixture(1024, 768))).toEqual({ width: 1024, height: 768 });
    expect(readJpegDimensions(Buffer.from([0xff, 0xd8, 0xff, 0xd9]))).toBeNull();
    expect(readJpegDimensions(Buffer.from('plain text'))).toBeNull();
  });

  it('reads WebP dimensions for lossy, lossless, and extended layouts', () => {
    expect(readWebpDimensions(webpLossyFixture(800, 600))).toEqual({ width: 800, height: 600 });
    expect(readWebpDimensions(webpLosslessFixture(100, 50))).toEqual({ width: 100, height: 50 });
    expect(readWebpDimensions(webpExtendedFixture(1200, 900))).toEqual({ width: 1200, height: 900 });
    expect(readWebpDimensions(Buffer.alloc(30))).toBeNull();
  });

  it('readImageDimensions sniffs the format from magic bytes', () => {
    expect(readImageDimensions(pngFixture(10, 20))).toEqual({ width: 10, height: 20 });
    expect(readImageDimensions(gifFixture(1, 2))).toEqual({ width: 1, height: 2 });
    expect(readImageDimensions(jpegFixture(3, 4))).toEqual({ width: 3, height: 4 });
    expect(readImageDimensions(webpLossyFixture(5, 6))).toEqual({ width: 5, height: 6 });
    expect(readImageDimensions(Buffer.from('<svg xmlns="x"/>'))).toBeNull();
    expect(readImageDimensions(Buffer.alloc(2))).toBeNull();
  });
});

// ── Byte-fidelity verification (sha1 vs asset id, SVG exemption) ─────────────

describe('assetIdParts / sha1Hex', () => {
  it('parses the sha1, dimensions, and extension out of an asset _id', () => {
    const sha1 = 'a'.repeat(40);
    expect(assetIdParts(`image-${sha1}-800x600-webp`)).toEqual({
      sha1,
      width: 800,
      height: 600,
      ext: 'webp',
    });
  });

  it('lowercases the hash and rejects malformed ids', () => {
    const upper = 'ABCDEF0123456789ABCDEF0123456789ABCDEF01';
    expect(assetIdParts(`image-${upper}-1x1-png`)?.sha1).toBe(upper.toLowerCase());
    expect(assetIdParts('image-tooshort-1x1-png')).toBeNull();
    expect(assetIdParts('file-' + 'a'.repeat(40) + '-1x1-pdf')).toBeNull();
    expect(assetIdParts(null)).toBeNull();
    expect(assetIdParts('')).toBeNull();
  });

  it('sha1Hex matches node crypto', () => {
    const buf = Buffer.from('veteranpcs');
    expect(sha1Hex(buf)).toBe(createHash('sha1').update(buf).digest('hex'));
    expect(sha1Hex(buf)).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe('looksLikeSvg', () => {
  it('accepts an <svg root, with optional BOM/whitespace/decl/comments/DOCTYPE', () => {
    expect(looksLikeSvg(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe(true);
    expect(looksLikeSvg(Buffer.from('<?xml version="1.0"?><svg/>'))).toBe(true);
    expect(looksLikeSvg(Buffer.from('\uFEFF  \n<svg/>'))).toBe(true);
    expect(looksLikeSvg(Buffer.from('<SVG viewBox="0 0 1 1"></SVG>'))).toBe(true);
    expect(
      looksLikeSvg(
        Buffer.from(
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<!-- exported from tool -->\n' +
            '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
            '<svg xmlns="http://www.w3.org/2000/svg"/>',
        ),
      ),
    ).toBe(true);
  });

  it('rejects an XML declaration with no <svg root', () => {
    expect(looksLikeSvg(Buffer.from('  \t\n<?xml version="1.0"?>'))).toBe(false);
    expect(looksLikeSvg(Buffer.from('<?xml version="1.0"?><Error><Code>AccessDenied</Code></Error>'))).toBe(false);
    expect(looksLikeSvg(Buffer.from('<?xml version="1.0"?><!-- hi --><rss version="2.0"/>'))).toBe(false);
  });

  it('rejects non-SVG bodies and lookalike element names', () => {
    expect(looksLikeSvg(Buffer.from('<html><body>not svg</body></html>'))).toBe(false);
    expect(looksLikeSvg(Buffer.from('<svgfoo/>'))).toBe(false);
    expect(looksLikeSvg(pngFixture(1, 1))).toBe(false);
    expect(looksLikeSvg(Buffer.alloc(0))).toBe(false);
  });
});

describe('isCdnSanitizedSvgAcceptable', () => {
  const svgBuf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');

  it('requires svg mime AND exact recorded size AND an SVG-shaped body', () => {
    expect(
      isCdnSanitizedSvgAcceptable({ buf: svgBuf, mimeType: 'image/svg+xml', assetSize: svgBuf.byteLength }),
    ).toBe(true);
    // wrong size
    expect(
      isCdnSanitizedSvgAcceptable({ buf: svgBuf, mimeType: 'image/svg+xml', assetSize: svgBuf.byteLength + 1 }),
    ).toBe(false);
    // wrong mime
    expect(
      isCdnSanitizedSvgAcceptable({ buf: svgBuf, mimeType: 'image/png', assetSize: svgBuf.byteLength }),
    ).toBe(false);
    // missing size
    expect(
      isCdnSanitizedSvgAcceptable({ buf: svgBuf, mimeType: 'image/svg+xml', assetSize: undefined }),
    ).toBe(false);
    // binary body claiming to be svg
    const png = pngFixture(1, 1);
    expect(
      isCdnSanitizedSvgAcceptable({ buf: png, mimeType: 'image/svg+xml', assetSize: png.byteLength }),
    ).toBe(false);
  });
});

describe('verifyRawAssetBytes', () => {
  const makeAsset = (buf: Buffer, ext: string, mimeType: string) => ({
    _id: `image-${sha1Hex(buf)}-10x10-${ext}`,
    mimeType,
    size: buf.byteLength,
  });

  it('verifies when the bytes hash to the sha1 embedded in the asset id', () => {
    const buf = webpLossyFixture(10, 10);
    const result = verifyRawAssetBytes(buf, makeAsset(buf, 'webp', 'image/webp'));
    expect(result).toEqual({
      sha1: sha1Hex(buf),
      expectedSha1: sha1Hex(buf),
      sha1Verified: true,
    });
  });

  it('fails with an error on a hash mismatch for non-SVG assets', () => {
    const original = webpLossyFixture(10, 10);
    const transcoded = pngFixture(10, 10); // CDN swapped the encoding
    const result = verifyRawAssetBytes(transcoded, makeAsset(original, 'webp', 'image/webp'));
    expect(result.sha1Verified).toBe(false);
    expect(result.error).toContain(sha1Hex(original));
    expect(result.error).toContain(sha1Hex(transcoded));
  });

  it('accepts a CDN-sanitized SVG (same byte length, different sha1)', () => {
    const original = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle/></svg>');
    const sanitized = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circlx/></svg>');
    expect(sanitized.byteLength).toBe(original.byteLength);
    const result = verifyRawAssetBytes(sanitized, makeAsset(original, 'svg', 'image/svg+xml'));
    expect(result).toEqual({
      sha1: sha1Hex(sanitized),
      expectedSha1: sha1Hex(original),
      sha1Verified: false,
      cdnSanitized: true,
    });
    expect(result.error).toBeUndefined();
  });

  it('rejects an SVG whose byte length does not match the recorded size', () => {
    const original = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle/></svg>');
    const truncated = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');
    const result = verifyRawAssetBytes(truncated, makeAsset(original, 'svg', 'image/svg+xml'));
    expect(result.sha1Verified).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('fails when the asset id is unparseable (no anchor to verify against)', () => {
    const buf = pngFixture(1, 1);
    const result = verifyRawAssetBytes(buf, { _id: 'image-not-a-real-id', mimeType: 'image/png', size: buf.byteLength });
    expect(result.expectedSha1).toBeNull();
    expect(result.sha1Verified).toBe(false);
    expect(result.error).toContain('unparseable asset id');
  });
});

describe('type JSON integrity hash (sha256Hex)', () => {
  it('matches node crypto and hashes strings and buffers identically', () => {
    const s = '[{"_id":"a"}]\n';
    expect(sha256Hex(s)).toBe(createHash('sha256').update(s).digest('hex'));
    expect(sha256Hex(Buffer.from(s, 'utf-8'))).toBe(sha256Hex(s));
  });

  it('detects same-id field corruption that count/_id parity misses', () => {
    const good = stableStringify([{ _id: 'a', _type: 't', title: 'real', path: '/images/content/x/logo.png' }]);
    const corrupted = stableStringify([{ _id: 'a', _type: 't', title: 'tampered', path: '/images/evil.png' }]);
    const ids = (s: string) => JSON.parse(s).map((d: { _id: string }) => d._id);
    // the old gate passes: same count, same _id set
    expect(ids(corrupted)).toEqual(ids(good));
    expect(JSON.parse(corrupted)).toHaveLength(JSON.parse(good).length);
    // the hash gate catches it
    expect(sha256Hex(corrupted)).not.toBe(sha256Hex(good));
    // and stays stable for a byte-identical rewrite
    expect(sha256Hex(good)).toBe(sha256Hex(stableStringify(JSON.parse(good))));
  });
});

describe('diffIdRevMaps', () => {
  it('reports added, removed, and rev-changed ids', () => {
    const prev = { a: 'rev1', b: 'rev2', c: 'rev3' };
    const next = { b: 'rev2', c: 'revX', d: 'rev4' };
    expect(diffIdRevMaps(prev, next)).toEqual({
      added: ['d'],
      removed: ['a'],
      changed: ['c'],
    });
  });

  it('is empty for identical maps and tolerates undefined inputs', () => {
    expect(diffIdRevMaps({ a: '1' }, { a: '1' })).toEqual({ added: [], removed: [], changed: [] });
    expect(diffIdRevMaps(undefined, undefined)).toEqual({ added: [], removed: [], changed: [] });
  });
});

describe('manifestsEquivalent', () => {
  const base = {
    exportedAt: '2026-07-13T00:00:00.000Z',
    types: { state_list: { count: 1, ids: { s1: 'r1' } } },
    images: [],
    report: { errors: [], warnings: [] },
  };

  it('ignores exportedAt but catches any content change', () => {
    expect(manifestsEquivalent(base, { ...base, exportedAt: '2027-01-01T00:00:00.000Z' })).toBe(true);
    expect(
      manifestsEquivalent(base, {
        ...base,
        types: { state_list: { count: 1, ids: { s1: 'r2' } } },
      }),
    ).toBe(false);
    expect(manifestsEquivalent(base, null)).toBe(false);
  });
});
