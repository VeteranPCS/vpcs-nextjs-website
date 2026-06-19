"use client";

import Link from "next/link";
import { normalizeBlogComponentSlug } from "@/lib/blog/components";

const BlogCategory = ({ categories_list }: { categories_list: Set<string> }) => {
    return (
        <div className="flex flex-wrap items-cenetr md:gap-10 sm:gap-5 gap-4 mt-5">
                {Array.from(categories_list).map((category) => {
                    const slug = normalizeBlogComponentSlug(category);
                    return (
                    <Link key={category} href={slug ? `/blog/category/${slug}` : "/blog"} className="text-[#292F6C] robot text-sm font-normal">
                        {category}
                    </Link>
                    );
                })}
        </div>
    );
};

export default BlogCategory;
