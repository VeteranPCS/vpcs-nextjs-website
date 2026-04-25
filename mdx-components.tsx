import type { MDXComponents } from 'mdx/types';
import Image, { type ImageProps } from 'next/image';
import Link from 'next/link';
import * as BlogMdx from '@/components/Blog/mdx';

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export const mdxComponents: MDXComponents = {
    h1: (props) => (
      <h1
        className="tahoma text-3xl md:text-4xl font-bold text-[#212529] mt-10 mb-4"
        {...props}
      />
    ),
    h2: (props) => (
      <h2
        className="tahoma text-2xl md:text-3xl font-bold text-[#212529] mt-8 mb-3"
        {...props}
      />
    ),
    h3: (props) => (
      <h3
        className="tahoma text-xl md:text-2xl font-bold text-[#212529] mt-6 mb-3"
        {...props}
      />
    ),
    h4: (props) => (
      <h4
        className="tahoma text-lg md:text-xl font-bold text-[#212529] mt-5 mb-2"
        {...props}
      />
    ),
    p: (props) => (
      <p className="roboto text-base leading-7 text-[#495057] my-4" {...props} />
    ),
    ul: (props) => (
      <ul
        className="roboto list-disc pl-6 my-4 text-[#495057] [&>li]:my-1"
        {...props}
      />
    ),
    ol: (props) => (
      <ol
        className="roboto list-decimal pl-6 my-4 text-[#495057] [&>li]:my-1"
        {...props}
      />
    ),
    li: (props) => <li className="leading-7" {...props} />,
    blockquote: (props) => (
      <blockquote
        className="border-l-4 border-[#A81F23] pl-4 my-6 italic text-[#495057]"
        {...props}
      />
    ),
    strong: (props) => <strong className="font-bold text-[#212529]" {...props} />,
    em: (props) => <em className="italic" {...props} />,
    code: (props) => (
      <code
        className="rounded bg-[#F1F3F5] px-1.5 py-0.5 text-sm font-mono text-[#212529]"
        {...props}
      />
    ),
    pre: (props) => (
      <pre
        className="rounded-xl bg-[#212529] text-[#F8F9FA] p-4 my-6 overflow-x-auto text-sm"
        {...props}
      />
    ),
    hr: () => <hr className="my-8 border-[#E5E5E5]" />,
    a: ({ href, children, ...rest }) => {
      const target = href ?? '#';
      if (isExternal(target)) {
        return (
          <a
            href={target}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#A81F23] underline hover:text-[#871B1C]"
            {...rest}
          >
            {children}
          </a>
        );
      }
      return (
        <Link
          href={target}
          className="text-[#A81F23] underline hover:text-[#871B1C]"
        >
          {children}
        </Link>
      );
    },
    img: ({ src, alt, ...rest }: ImageProps) => {
      if (typeof src !== 'string') return null;
      return (
        <Image
          src={src}
          alt={alt ?? ''}
          width={800}
          height={450}
          className="w-full h-auto rounded-xl object-cover my-6"
          {...rest}
        />
      );
    },
    ...BlogMdx,
};

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...mdxComponents, ...components };
}
