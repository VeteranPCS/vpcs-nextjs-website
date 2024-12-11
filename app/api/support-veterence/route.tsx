import { NextResponse } from "next/server";
import { client } from "../../../sanity/lib/client";
import { SanityDocument } from "@sanity/client";
import { urlForImage } from "@/sanity/lib/image";

interface ReviewDocument extends SanityDocument {
    _type: "blog";
    title: string;
    publishedAt: string;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get("slug");

        const post = await client.fetch<ReviewDocument>(
            `*[_type == "support_veterence" && slug.current == $slug][0]`,
            { slug }
        )

        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        if (post.image?.asset?._ref) {
            post.image.asset.image_url = urlForImage(post.image.asset); // Add the image URL to the response
        }

        if (post.icon?.asset?._ref) {
            post.icon.asset.image_url = urlForImage(post.icon.asset); // Add the image URL to the response
        }

        return NextResponse.json(post)
    } catch (error) {
        return NextResponse.json(
            { error: `Error fetching post(s): ${error}` },
            { status: 500 }
        );
    }
}
