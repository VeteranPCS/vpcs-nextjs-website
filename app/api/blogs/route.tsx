import { NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";
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
        const category = searchParams.get("category")

        if (slug) {
            const blog = await client.fetch<ReviewDocument>(
                `*[_type == "blog" && slug.current == $slug]{
                  ...,
                  mainImage{
                    ...,
                    "image_url": asset->url // Directly fetch the main image URL
                  },
                  author->{
                    _id,
                    name,
                    designation,
                    "image": image.asset->url // Fetch author's image URL
                  },
                  categories[]->{
                    _id,
                    title
                  }
                }[0]`,
                { slug }
            );
        
            if (!blog) {
                return NextResponse.json({ error: "Blog not found" }, { status: 404 });
            }
        
            return NextResponse.json(blog); // Directly return the blog data
        } else {           
            const blogs = await client.fetch<ReviewDocument[]>(`
                *[_type == "blog" && component_slug.current == $category]{
                  ...,
                  mainImage{
                    ...,
                    "image_url": asset->url // Directly fetch the main image URL
                  },
                  author->{
                    _id,
                    name,
                    designation,
                    "image": image.asset->url // Fetch author's image URL
                  },
                  categories[]->{
                    _id,
                    title
                  }
                }
              `, { category });

            return NextResponse.json(blogs);
        }
    } catch (error) {
        return NextResponse.json(
            { error: `Error fetching post(s): ${error}` },
            { status: 500 }
        );
    }
}
