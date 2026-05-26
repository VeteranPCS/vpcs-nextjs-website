import remarkGfm from 'remark-gfm';
import type { MDXRemoteProps } from 'next-mdx-remote/rsc';

export const mdxOptions: NonNullable<MDXRemoteProps['options']> = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
  },
};
