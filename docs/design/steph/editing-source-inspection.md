# Authorized source-asset inspection — 2026-10-10

## Result

The user explicitly authorized inspection of the previously excluded [steph editing files](https://drive.google.com/drive/folders/1ibt7AVFdX1tbBV6Rs2MiSnkf9S-v3utC) folder. Two agents inspected standalone images and Illustrator/PDF sources in parallel. The coordinator independently viewed all five contact sheets and verified every downloaded file's byte size and SHA-256 checksum.

**No usable replacement for the remaining missing photos or font sources was found.** No website code or deployed asset changed. The existing visual evidence remains applicable; final fidelity acceptance remains open as recorded in [DISCREPANCIES.md](DISCREPANCIES.md).

## Retrieved inventory

All **40 direct files** were downloaded unchanged: four `.ai` documents, one Illustrator temporary PDF, two other PDFs, 32 PNGs and one JPG. There were no subfolders. The [inventory](editing-source-inventory.json) records every Drive ID, title, MIME type, local filename, byte size and checksum, plus image dimensions where applicable.

Originals and inspection evidence are preserved at:

`/Users/harperfoley/.codex/visualizations/2026/10/10/01a1238e-ff79-78f3-a921-ff8ccdbb7759/steph-redesign/assets-retrieval-2/`

## Exact page-artwork matches

| Source | Drive ID | Size | Finding |
|---|---|---|---|
| `d9d8fc6c-3a91-4cfa-ab0a-d422a411e69c.png` | `1B-0HMQoeWigOXVWINNGo0-6ZGCriIw6G` | 892 × 1764 | Pixel-identical to the VA PDF's native image object. Calculator/UI still obscures the hero; card resolution is unchanged. |
| `fd1d9b78-9327-4e80-9531-a1b51c8e2262.png` | `1x-cG--21uA_XkBfcNeqSWCOuHwYdMIpC` | 864 × 1821 | Pixel-identical to the Resources PDF's native image object. The same hero, card and installation pixels are composited with UI. |

The coordinator independently confirmed both RGB pixel comparisons. These files permit the same clean native crops already implemented; they reveal no covered pixels or additional resolution.

The remaining 30 PNGs are other design mockups or website screenshots. The single 4032 × 3024 JPG is an unrelated family portrait. All 33 standalone images were visually inspected; none was promoted as a replacement.

## Illustrator and PDF evidence

All seven PDF-compatible documents were inspected. Thirty unique PDF image objects were extracted, deduplicated and visually reviewed. They contain the known homepage/flag/guide assets and flattened mockups.

The latest six-page Illustrator temporary source, Drive ID `1NyDcAsrWKwZuGsmNBsmes2WRvdrkUaAv`, contains:

- VA Loan on page 5, image object 54: one 892 × 1764 flattened bitmap, with no PDF font objects on that page.
- Resources on page 6, image object 58: one 864 × 1821 flattened bitmap, with no PDF font objects on that page.

Five Illustrator private streams were successfully decompressed from their Zstandard containers. Native document headers and linked-source records were inspected. The referenced paths are designer-local files, including the exact two page PNGs above and already-known logos, guides, screenshots and family/check photographs. No HTTP(S) asset reference was found in those decoded streams.

**Scope limit:** proprietary edit data and binary raster payloads were not exhaustively reconstructed. The finding describes the exposed PDF images and linked-source records; it is not a proof that every possible hidden private raster has been decoded.

## Font findings

Editable source text and native document headers confirm Tahoma/Tahoma Bold, with Myriad Pro Regular/Bold in some sections. The PDF font objects are embedded subsets. The latest VA/Resources page rasters have no font objects from which to identify their raster text independently.

No standalone TTF/OTF/WOFF/WOFF2, font archive, web-kit CSS/URL or licensing document was found in the folder. No TTF/OTF link was found in the decoded private streams. No complete deployable font source was recovered, and no PDF subset was converted into a webfont.

## Remaining acceptance dependencies

- Full clean Resources family/house/flag hero.
- Full clean VA couple/keys/house hero, including the covered lower composition.
- Larger originals for the eight Resources/VA card photos.
- Matching clean installation photographs or acceptance of the existing guide imagery.
- Deployable intended fonts or supplied webfont-kit configuration.

## Detailed evidence

Within the preserved folder:

- `download-manifest.json` and `drive-inventory.json`: complete file provenance.
- `STANDALONE-FINDINGS.md` and `standalone-sheet-{1,2,3}.png`: standalone inspection.
- `AI-PDF-FINDINGS.md`: per-document page counts, Drive IDs, font families and linked-source findings.
- `embedded-inspection/inventory.json`, `unique-images.json`, `embedded-sheet-{1,2}.png`: object inventories and viewed images.
- `embedded-inspection/private-stream-evidence.json`: decoded native headers and bounded checks. Raw designer-local paths are retained only in local evidence, not this tracked summary.

No Drive content, sharing settings or folder organization was changed. No external messages were sent.
