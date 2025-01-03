import "@/styles/globals.css";
import Link from "next/link";
import classes from "./PcsResourcesBlog.module.css";
import { urlForImage } from "@/sanity/lib/image";
import { BlogDetails } from "@/app/blog/page";

// Define types for the props
interface Category {
  _id: string;
  title: string;
}

interface Author {
  image: string;
  name: string;
  designation: string;
}

interface PcsResourcesBlogProps {
  blogList: BlogDetails[];
  component: string;
}

interface BlockChild {
  _type: string;
  text: string;
}

interface Block {
  _type: string;
  children: BlockChild[];
}

const PcsResourcesBlog: React.FC<PcsResourcesBlogProps> = async ({ blogList, component }) => {
  function formatDate(timestamp: string): string {
    const date = new Date(timestamp); // Parse the timestamp into a Date object
    const day = String(date.getDate()).padStart(2, "0"); // Get day with leading zero
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Get month (0-based index, add 1)
    const year = date.getFullYear(); // Get full year

    return `${day}.${month}.${year}`; // Return formatted date
  }

  // Function to extract plain text from the content
  const getPlainText = (content: Block[]): string => {
    if (!content) return '';

    return content
      .map((block) => {
        if (block._type !== 'block' || !block.children) return '';
        return block.children
          .map((child) => child.text)
          .join('');
      })
      .join('\n\n');
  };

  return (
    <div className="py-6 px-5" id={component}>
      <div className="container mx-auto">
        <div className="flex flex-wrap gap-5 items-end lg:justify-between md:justify-between sm:justify-center justify-center">
          <div className="lg:text-left md:text-left sm:text-center text-center">
            <h1 className="text-[#292F6C] lg:text-[42px] md:text-[42px] sm:text-[30px] text-[30px] font-bold tahoma lg:text-left md:text-left sm:text-center text-center">
              {component}
            </h1>
          </div>
        </div>
        <div
          className={`grid ${blogList.length === 1
            ? "lg:grid-cols-1"
            : blogList.length === 2
              ? "lg:grid-cols-2"
              : "lg:grid-cols-3"
            } md:grid-cols-2 sm:grid-cols-1 grid-cols-1 gap-6 mt-10`}
        >

          {blogList.map((blog) => (
            <Link href="/blog/[slug]" as={`/blog/${blog?.slug?.current || "/blog"}`} key={blog._id} className={classes.blogimageone} style={{ backgroundImage: `url("${urlForImage(blog.mainImage)}")` }}>
              <div className="flex items-center absolute top-4 right-4 gap-2">
                {blog?.categories?.map((category) => (
                  <div
                    key={category._id}
                    className="rounded-lg bg-white/15 px-4 py-2 text-white roboto text-xs font-bold"
                  >
                    {category?.title}
                  </div>
                ))}
              </div>

              <div className="absolute bottom-4 left-2 px-6 py-1">
                <p className="text-[#E5E5E5] lg:text-[14px] md:text-[14px] sm:text-[12px] text-[12px] font-normal leading-normal">
                  {formatDate(blog?._createdAt)}
                </p>
                <h3 className="text-white tahoma lg:text-[21px] md:text-[21px] sm:text-[15px] text-[15px] font-bold my-3">
                  {blog?.title}
                </h3>
                <p className="text-[#E5E5E5] roboto lg:text-[14px] md:text-[14px] sm:text-[12px] text-[12px] font-normal lg:w-[370px] line-clamp-3">
                  {getPlainText(blog?.content)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PcsResourcesBlog;
