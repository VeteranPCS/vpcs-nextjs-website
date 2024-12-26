import "@/styles/globals.css";
import Link from "next/link";
import classes from "./PcsResourcesBlog.module.css";
import blogService from '@/services/blogService';

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

interface BlogDetails {
  _id: string;
  title: string;
  content: any[]; // This could be further refined depending on your content type
  _createdAt: string;
  slug: { current: string };
  mainImage: { image_url: string; alt: string };
  categories: Category[];
  author: Author;
}

interface PcsResourcesBlogProps {
  title: string;
  description: string;
  link: string;
  url: string;
}

interface BlockChild {
  _type: string;
  text: string;
}

interface Block {
  _type: string;
  children: BlockChild[];
}

const PcsResourcesBlog: React.FC<PcsResourcesBlogProps> = async ({ title, description, link, url }) => {
  
  // Function to generate slug from title
  function generateSlug(title: string): string {
    return title
      .toLowerCase() // Convert to lowercase
      .replace(/'/g, "") // Remove apostrophes
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric characters with hyphens
      .replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens
  }

  // Function to format date
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

    let blogs: BlogDetails[] | null = null;

    try {
        blogs = await blogService.fetchBlogs(generateSlug(title)); // fetch data on the server side
    } catch (error) {
        console.error("Error fetching blog", error);
    }

    // Check if blog is null and render error page
    if (!blogs) {
        return <p>Failed to load the blog.</p>;
    }

  return (
    <div className="py-6 px-5">
      <div className="container mx-auto">
        <div className="flex flex-wrap gap-5 items-end lg:justify-between md:justify-between sm:justify-center justify-center">
          <div className="lg:text-left md:text-left sm:text-center text-center">
            <h1 className="text-[#292F6C] lg:text-[42px] md:text-[42px] sm:text-[30px] text-[30px] font-bold tahoma lg:text-left md:text-left sm:text-center text-center">
              {title || ""}
            </h1>
            <p className="text-[#1F1D55] lg:text-[21px] md:text-[21px] sm:text-[15px] text-[15px] font-normal tahoma lg:text-left md:text-left sm:text-center text-center">
              {description || ""}
            </p>
            <div>
              <Link
                href={url || ""}
                className="text-[#292F6C] lg:text-[14px] md:text-[14px] sm:text-[12px] text-[12px] font-bold roboto"
              >
                {link || ""}
              </Link>
            </div>
          </div>
        </div>
        <div
          className={`grid ${blogs.length === 1
            ? "lg:grid-cols-1"
            : blogs.length === 2
              ? "lg:grid-cols-2"
              : "lg:grid-cols-3"
            } md:grid-cols-2 sm:grid-cols-1 grid-cols-1 gap-6 mt-10`}
        >
              {/* <Link href="/blog/[slug]" as={`/blog/${blogDetails?.slug?.current || "default-slug"}`} className="pt-12 md:px-0 px-5"> */}

          {blogs.map((blog) => (
            <Link href="/blog/[slug]" as={`/blog/${blog?.slug?.current || "default-slug"}`} key={blog._id} className={classes.blogimageone} style={{ backgroundImage: `url(${blog?.mainImage?.image_url || "/assets/BlogImage1.png"} )` }}>
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
                <p className="text-[#E5E5E5] roboto lg:text-[14px] md:text-[14px] sm:text-[12px] text-[12px] font-normal lg:w-[370px]">
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
