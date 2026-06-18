import "@/app/globals.css";
import classes from "./BlogDetailsHeroSection.module.css";
import type { BlogPost, ResolvedAuthor } from "@/lib/blog/types";

type Props = {
  blog: BlogPost;
  resolvedAuthor: ResolvedAuthor;
};

export default function BlogDetailsHeroSection({ blog, resolvedAuthor }: Props) {
  const bg = blog.mainImage?.src || "/assets/blogctabgimage.png";
  return (
    <div className="relative">
      <div
        className={classes.blogdetailspageherosectioncontainer}
        style={{ backgroundImage: `url("${bg}")` }}
      >
        <div className="flex flex-col justify-center items-center">
          <div>
            <div className="text-center">
              <h1 className="text-white text-center tahoma lg:text-[36px] md:text-[36px] sm:text-[36px] text-[36px] font-bold mt-8 mb-3 max-w-[800px]">
                {blog.title}
              </h1>
              <div>
                <h6 className="text-white tahoma text-sm font-bold mt-10">
                  By {resolvedAuthor.name}
                </h6>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
