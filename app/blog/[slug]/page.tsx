import { memo } from "react";
import BlogDetailsHeroSection from "@/components/BlogDetails/BlogDetailsHeroSection/BlogDetailsHeroSection";
import BlogBeginingPostAgent from "@/components/BlogDetails/BlogBeginingBlogPostAgent/BlogBeginingBlogPostAgent";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import BlogDetailsCta from "@/components/BlogDetails/BlogDetailsCta/BlogDetailsCta";
import EndBlogPostDetails from "@/components/BlogDetails/EndBlogPostDetails/EndBlogPostDetails";
import FrequentlyAskedQuestion from "@/components/stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";
import blogService from "@/services/blogService";
import CommonBlog from "@/components/BlogPage/BlogPage/BlogCTA/CommonBlog";

// Memoize FAQ component for performance
const MemoizedFrequentlyAskedQuestion = memo(FrequentlyAskedQuestion);

interface BlogProps {
    blog: Record<string, any> | null; // Allow blog to be null
}

export default async function Home({ params }: { params: { slug: string } }) {
    const { slug } = params;
    let blog: Record<string, any> | null = null;

    try {
        blog = await blogService.fetchBlog(slug); // fetch data on the server side
    } catch (error) {
        console.error("Error fetching blog", error);
    }

    // Check if blog is null and render error page
    if (!blog) {
        return <p>Failed to load the blog.</p>;
    }

    return (
        <>
            <BlogDetailsHeroSection blog={blog} />
            <BlogBeginingPostAgent blog={blog} />
            <Testimonials />
            <BlogDetailsCta />
            <EndBlogPostDetails blog={blog} />
            <CommonBlog component="Related Posts"/>
            <MemoizedFrequentlyAskedQuestion />
            <KeepInTouch />
            <Footer />
        </>
    );
}
