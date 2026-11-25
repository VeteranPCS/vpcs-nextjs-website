import { afterEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import openGraphImage from '../opengraph-image';
import twitterImage from '../twitter-image';

vi.mock('server-only', () => ({}));

const routeParams = (slug: string) => ({ params: Promise.resolve({ slug }) });

async function readPng(response: Response) {
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    const png = Buffer.from(await response.arrayBuffer());
    expect(await sharp(png).metadata()).toMatchObject({ format: 'png', width: 1200, height: 630 });
    return png;
}

const backgroundPixels = (png: Buffer) =>
    sharp(png).extract({ left: 0, top: 0, width: 120, height: 90 }).raw().toBuffer();

describe('blog share image routes', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    it('embeds the checked-in hero and logo in both PNGs without fetching the preview origin', async () => {
        vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://protected-preview.example.invalid');
        const originalFetch = globalThis.fetch;
        const networkFetch = vi.fn((url: string) => Promise.reject(new Error(`Unexpected image fetch: ${url}`)));
        vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
            const url = input instanceof Request ? input.url : String(input);
            // The pinned renderer loads its bundled WebAssembly through a data URI.
            return url.startsWith('data:application/octet-stream;base64,')
                ? originalFetch(input, init)
                : networkFetch(url);
        });

        const slug = 'pcs-to-fort-gordon';
        const [og, twitter, fallback] = await Promise.all([
            openGraphImage(routeParams(slug)).then(readPng),
            twitterImage(routeParams(slug)).then(readPng),
            openGraphImage(routeParams('missing-test-article')).then(readPng),
        ]);
        expect(og.equals(twitter)).toBe(true);
        const [hero, fallbackHero] = await Promise.all([backgroundPixels(og), backgroundPixels(fallback)]);
        expect(hero.equals(fallbackHero)).toBe(false);

        // The translucent backdrop can't produce pure white. The logo in the lower
        // center contributes opaque white pixels there, below the article title.
        const logoRegion = await sharp(og)
            .extract({ left: 448, top: 365, width: 304, height: 160 })
            .removeAlpha().raw().toBuffer();
        let whitePixels = 0;
        for (let i = 0; i < logoRegion.length; i += 3) {
            if (logoRegion[i] === 255 && logoRegion[i + 1] === 255 && logoRegion[i + 2] === 255) whitePixels++;
        }
        expect(whitePixels).toBeGreaterThan(500);
        expect(networkFetch).not.toHaveBeenCalled();
    });
});
