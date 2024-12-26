import { NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";
import { SanityDocument } from "@sanity/client";
import { urlForImage } from "@/sanity/lib/image";

interface ReviewDocument extends SanityDocument {
    _type: "aboutUsPage";
    title: string;
    publishedAt: string;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const component = searchParams.get("component");

        const details = await client.fetch<ReviewDocument>(
            `*[_type == "aboutUsPage" && componentName == $component][0]`,
            { component }
        )

        if (!details) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        if (details.background_image?.asset?._ref) {
            details.background_image.asset.image_url = urlForImage(details.background_image.asset); // Add the image URL to the response
        }

        if (details.foreground_image?.asset?._ref) {
            details.foreground_image.asset.image_url = urlForImage(details.foreground_image.asset); // Add the image URL to the response
        }

        return NextResponse.json(details)
    } catch (error) {
        return NextResponse.json(
            { error: `Error fetching post(s): ${error}` },
            { status: 500 }
        );
    }
}
