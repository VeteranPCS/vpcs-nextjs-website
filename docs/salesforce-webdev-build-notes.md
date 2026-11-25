# Running a local WebDev build when Google Fonts fails

Start with `npm run build:sandbox`. Next.js 16.2.6 can fail after fetching Google Fonts CSS when a font file URL has query parameters and no file extension. The WebDev build on 2026-11-25 reported 27 Roboto errors from Turbopack’s `NextFontGoogleFontFileReplacer`, each with `next/font/google queries have exactly one entry`. A build with `--webpack` also failed during font file extension detection. Google Fonts can return different URL formats for the same CSS request, so a fresh build may succeed. [Next.js issue #99114](https://github.com/vercel/next.js/issues/99114)

For an immediate local functional check, use the repository’s font fallback fixture for the build and start the resulting sandbox artifact from the repository root.

```sh
NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$PWD/scripts/fixtures/google-fonts-mock.json" npm run build:sandbox
npm run start:sandbox
```

The build still authenticates to the configured Salesforce WebDev sandbox, uses the real sandbox data path and produces a `.next-sandbox` artifact. The fixture substitutes local fallback fonts during compilation. Use this artifact for data and route verification. Use a successful build with Google Fonts for typography and pixel-exact screenshot verification. Keep the fixture setting scoped to the local command above.

When using a custom port, set `NEXT_PUBLIC_API_BASE_URL` to the same loopback origin during the build and pass the matching port to `start:sandbox`. The state image API returns URLs using the public base baked into the build. A build with the default origin returned a port `3000` image URL when served on port `3100`.

Next.js 16.4.3 includes the fix for both bundlers. The repository build described here uses Next.js 16.2.6. [Next.js 16.4.3 release notes](https://github.com/vercel/next.js/releases/tag/v16.4.3)

## Baseline defects found in browser verification

- The Colorado fixture area appears in `GET /api/v1/areas?state=CO`. That endpoint returns `vpcs-webdev-test-webdevinitial20261125-area`, which produces `404` with `No agent found for area` when passed to `GET /api/v1/states/colorado/area-agent`. The lookup returns the expected fixture agent and contact URL when given `vpcs-webdev-test-webdev-initial-20261125-area`. The existing coverage slug generator strips hyphens within names and the existing agent lookup preserves them as separators. The Agent Finder falls back to the generic state contact URL on this response. The Colorado partner cards link directly to their selected partner forms.
- `/impact` displays the sandbox totals and logs React hydration error `#418` in Chromium on desktop, tablet and mobile. `WearBlueSection.tsx` wraps a rich-text block in a paragraph, resulting in nested paragraphs in the server-rendered HTML. The browser parser restructures that markup before React hydrates it. [WearBlueSection.tsx](../components/Impact/WearBlueSection/WearBlueSection.tsx)
- On `/agents` and `/lenders`, the fixed header covers the top 32 pixels of each directory heading at 1440 pixels wide and the top 16 pixels at 820 and 390 pixels wide. The fixture rows remain visible and link to Colorado. The directory heading layout and site header spacing match the baseline source.
