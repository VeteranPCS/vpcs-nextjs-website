import { NextResponse } from "next/server";
import { client } from "../../../sanity/lib/client";
import { SanityDocument } from "@sanity/client";
import { urlForImage } from "@/sanity/lib/image";

interface ReviewDocument extends SanityDocument {
    _type: "aboutUsPage";
    title: string;
    publishedAt: string;
}

export async function GET(request: Request) {
    try {
        const details = await client.fetch<ReviewDocument>(
            `*[_type == "aboutSupportComponent"][0]`
        )

        if (!details) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        if (details.image?.asset?._ref) {
            details.image.asset.image_url = urlForImage(details.image.asset); // Add the image URL to the response
        }

        return NextResponse.json(details)
    } catch (error) {
        return NextResponse.json(
            { error: `Error fetching post(s): ${error}` },
            { status: 500 }
        );
    }
}
