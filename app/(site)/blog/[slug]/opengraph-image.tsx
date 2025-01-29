import { ImageResponse } from 'next/og'
import blogService from '@/services/blogService'

export const alt = 'VeteranPCS Blog'

export const size = {
    width: 1200,
    height: 630,
}
export const contentType = 'image/png'
export const runtime = "edge"

export default async function Image({ params }: { params: { slug: string } }) {

    const blog = await blogService.fetchBlog(params.slug)
    const title = blog.short_title || 'Default Title'
    const image_url = blog?.mainImage.image_url || '/assets/blogctabgimage.png'
    const logo_url = blog?.logo || '/assets/blogctabgimage.png'

    // Font
    const loraBold = fetch(
        new URL('@/styles/lora-font/Lora-Bold.ttf', import.meta.url)
    ).then((res) => res.arrayBuffer())

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
                    backgroundImage: `linear-gradient(to right, rgba(255, 0, 0, 0.7), rgba(0, 0, 255, 0.5)), url(${image_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    padding: '40px',
                }}
            >
                {/* Main Title */}
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

                {/* VeteranPCS Logo */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginTop: '0px',
                        width: '304px',
                        height: '71px',
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logo_url} alt={title || ""} height={71} width={304} />
                </div>
            </div>
        ),
        {
            ...size,
            fonts: [
                {
                    name: 'Lora',
                    data: await loraBold,
                    style: 'normal',
                    weight: 700,
                },
            ],
        }
    )
}