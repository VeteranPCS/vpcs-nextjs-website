import React from "react";
import "@/styles/globals.css";
import classes from "./BlogDetailsHeroSection.module.css";
import { formatDate } from "@/utils/helper";


const BlogDetailsHeroSection = ({ blog }: { blog: Record<string, any> }) => {
  return (
    <div className="relative">
      <div className={classes.blogdetailspageherosectioncontainer} style={{ backgroundImage: `url("${blog?.mainImage.image_url || "/assets/blogctabgimage.png"}")` }}>
        <div className="flex flex-col justify-center items-center">
          <div>
            <div className="text-center">
              <h1 className="text-white text-center tahoma lg:text-[36px] md:text-[36px] sm:text-[36px] text-[36px] font-bold mt-8 mb-3">
                {blog?.title}
              </h1>
              <div>
                <h6 className="text-white tahoma text-sm font-bold mt-10">
                  By {blog?.author?.name}
                </h6>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogDetailsHeroSection;
