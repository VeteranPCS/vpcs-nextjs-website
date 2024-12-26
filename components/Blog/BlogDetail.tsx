import Image from 'next/image';
import BlockContent from './BlockContent';

// Define the Block type that matches BlockContent's expectations
type BlockStyle = "h1" | "h2" | "h3" | "normal";

// Update BlogData to use a more flexible content type
interface BlogData {
  title: string;
  publishedAt: string;
  mainImage: {
    asset: {
      image_url: string;
    };
  };
  content: {
    _key: string;
    style: string;
    children: {
      _key: string;
      marks: string[];
      text: string;
    }[];
  }[];
}

interface Block {
  _key: string;
  children: Child[];
  style: 'h1' | 'h2' | 'h3' | 'normal'; // Explicitly define the style types
  listItem?: 'bullet'; // Optional property for list items
  level?: number; // Optional property for list nesting level
}

interface Child {
  _key: string;
  marks: string[]; // Assuming marks is an array of strings (e.g., ['strong', 'italic'])
  text: string; // The text content of the child
}

interface BlogDetailProps {
  blogData: BlogData;
}

interface BlockContentProps {
  block: Block; // Single block instead of an array
}

const BlogDetail: React.FC<BlogDetailProps> = ({ blogData }) => {
  const validateBlockStyle = (style: string): BlockStyle => {
    const validStyles: BlockStyle[] = ["h1", "h2", "h3", "normal"];
    return validStyles.includes(style as BlockStyle) 
      ? (style as BlockStyle) 
      : "normal";
  };

  return (
    <div className="max-w-7xl mx-auto py-16 px-4">
      <nav className="flex mb-8 text-gray-600">
        <span className="text-gray-900">{blogData?.title}</span>
      </nav>

      <article className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {blogData?.title}
        </h1>
        <time className="text-gray-600 mb-8 block">
          {new Date(blogData?.publishedAt).toLocaleDateString()}
        </time>
        
        <div className="relative h-96 mb-8">
          <Image
            height={100}
            width={100}
            src={blogData?.mainImage?.asset?.image_url || "/api/placeholder/400/320"}
            alt={blogData?.title}
            className="absolute inset-0 w-full h-full object-cover rounded-lg"
          />
        </div>

        <div className="prose prose-lg max-w-none">
          {blogData?.content?.map((block, index) => (
            <BlockContent 
              key={block._key || index} 
              blocks={[
                {
                  ...block,
                  style: validateBlockStyle(block.style),
                },
              ]}
            />
          ))}
        </div>
      </article>
    </div>
  );
};

export default BlogDetail;