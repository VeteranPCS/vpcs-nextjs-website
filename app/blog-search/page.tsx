import SearchBlog from "@/components/SearchBlog/SearchBlog";
import blogService from "@/services/blogService";
import { BlogDetails } from "@/components/SearchBlog/SearchBlog";

export default async function Home({ searchParams }: { searchParams: { query: string } }) {
  const query = searchParams?.query || '';

  let searchedBlog: BlogDetails[] | null = [];

  try {
    searchedBlog = await blogService.SearchBlog(query); // fetch data on the server side
  } catch (error) {
    console.error("Error fetching blog", error);
  }

  return (
    <>
      <SearchBlog searchedBlog={searchedBlog} />
    </>
  );
}
