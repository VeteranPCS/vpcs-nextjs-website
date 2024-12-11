import { NextResponse } from "next/server";
import { client } from "../../../sanity/lib/client";
import { SanityDocument } from "@sanity/client";
import { urlForImage } from "@/sanity/lib/image";

// interface ReviewDocument extends SanityDocument {
//     _type: "blog";
//     title: string;
//     publishedAt: string;
// }

interface MainImage {
    alt: string; // Alternative text for the image
    asset: {
        image_url?: string; // URL of the image
        _ref: string; // Reference ID for the image asset
        _type: string; // Type of the asset, typically "reference"
    };
    _type: "image"; // Type of the main image, typically "image"
}

interface MemberDetails extends SanityDocument {
    image: MainImage;
    name: string;
    designation: string;
    roles: string,
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const roles = searchParams.get("roles");

        const details = await client.fetch<MemberDetails[]>(
            `*[_type == "member_info" && roles == $roles]`,
            { roles }
        )

        if (!details) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        details.map((detail) => {
            if (detail.image?.asset?._ref) {
                detail.image.asset.image_url = urlForImage(detail.image.asset); // Add the image URL to the response
            }
        })

        return NextResponse.json(details)
    } catch (error) {
        return NextResponse.json(
            { error: `Error fetching post(s): ${error}` },
            { status: 500 }
        );
    }
}
