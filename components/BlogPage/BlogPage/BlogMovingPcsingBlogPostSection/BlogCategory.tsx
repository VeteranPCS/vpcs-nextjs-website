"use client";

const BlogCategory = ({ categories_list }: { categories_list: Set<string> }) => {
    return (
        <div className="flex flex-wrap items-cenetr md:gap-10 sm:gap-5 gap-4 mt-5">
                {Array.from(categories_list).map((category, index) => (
                    <button key={index} onClick={() => {
                        const targetElement = document.getElementById(category);
                        if (targetElement) {
                            targetElement.scrollIntoView({ behavior: "smooth" });
                        }
                    }} className="text-[#292F6C] robot text-sm font-normal">
                        {category}
                    </button>
                ))}
        </div>
    );
};

export default BlogCategory;