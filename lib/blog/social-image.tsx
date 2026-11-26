import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { getBlogBySlug } from '@/lib/blog/mdx';

async function readHeroImage(src?: string) {
    const bundledPath = src?.match(/^\/images\/blog\/([a-z0-9-]+\/(?:main|hero)[a-z0-9._-]*\.(?:gif|jpe?g|png|webp))$/)?.[1];
    if (bundledPath) {
        try {
            return await readFile(join(process.cwd(), 'public/images/blog', bundledPath));
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
    }
    return readFile(join(process.cwd(), 'public/assets/blogctabgimage.webp'));
}

export async function renderBlogSocialImage(slug: string, size: { width: number; height: number }) {
    const blog = await getBlogBySlug(slug);
    const title = blog?.shortTitle || blog?.title || 'VeteranPCS';
    const [hero, logo, loraBold] = await Promise.all([
        readHeroImage(blog?.mainImage?.src),
        readFile(join(process.cwd(), 'public/icon/VeteranPCSlogo.svg'), 'base64'),
        readFile(join(process.cwd(), 'styles/lora-font/Lora-Bold.ttf')),
    ]);

    // The bundled ImageResponse renderer supports embedded PNG but cannot decode our WebP heroes.
    const heroPng = await sharp(hero).png().toBuffer();
    const heroSrc = `data:image/png;base64,${heroPng.toString('base64')}`;
    const logoSrc = `data:image/svg+xml;base64,${logo}`;

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundImage: `linear-gradient(to right, rgba(255, 0, 0, 0.7), rgba(0, 0, 255, 0.5)), url(${heroSrc})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    padding: '40px',
                }}
            >
                <div
                    style={{
                        color: 'white',
                        fontSize: 60,
                        fontWeight: '100',
                        textAlign: 'center',
                        marginBottom: '60px',
                        maxWidth: '70%',
                        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
                    }}
                >
                    {title}
                </div>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginTop: '0px',
                        width: '304px',
                        height: '71px',
                    }}
                >
                    {/* ImageResponse renders regular image elements. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoSrc} alt={title} height={71} width={304} />
                </div>
            </div>
        ),
        {
            ...size,
            fonts: [
                {
                    name: 'Lora',
                    data: loraBold,
                    style: 'normal',
                    weight: 700,
                },
            ],
        },
    );
}
