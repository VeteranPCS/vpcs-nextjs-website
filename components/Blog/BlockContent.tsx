import React from 'react';
import '@/app/globals.css';
import Link from 'next/link';
import Image from 'next/image';
import { urlForImage } from '@/sanity/lib/image';

interface Child {
  _key: string;
  marks: string[];
  text: string;
}

interface Block {
  _key: string;
  _type?: string;
  children?: Child[];
  style?: 'h1' | 'h2' | 'h3' | 'h4' | 'normal';
  listItem?: 'bullet';
  level?: number;
  markDefs?: {
    _key: string;
    _type: string;
    href: string;
  }[];
  // Image-specific properties
  asset?: {
    _ref: string;
    _type: string;
  };
  alt?: string;
}

interface TextSpanProps {
  child: Child;
  block: Block;
}

const TextSpan: React.FC<TextSpanProps> = ({ child, block }) => {
  const renderText = () => {
    if (child.marks && child.marks.includes('strong')) {
      return <strong className="font-bold">{child.text}</strong>;
    }
    return child.text;
  };

  // Handle links
  if (child.marks && child.marks.length > 0) {
    const linkMark = child.marks.find(mark => mark !== 'strong');
    if (linkMark && block.markDefs) {
      const linkDef = block.markDefs.find(def => def._key === linkMark);
      if (linkDef) {
        return (
          <Link
            href={linkDef.href}
            className="text-blue-600 hover:text-blue-800 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {renderText()}
          </Link>
        );
      }
    }
  }

  return <>{renderText()}</>;
};

interface BlockContentProps {
  blocks: Block[];
}

const BlockContent: React.FC<BlockContentProps> = ({ blocks }) => {
  const renderContent = (children: Child[], block: Block) => {
    if (!children || !Array.isArray(children)) {
      return null;
    }
    return children.map((child) => (
      <TextSpan key={child._key} child={child} block={block} />
    ));
  };

  const renderBlock = (block: Block) => {
    // Handle image blocks
    if (block._type === 'image') {
      if (!block.asset) return null;

      const imageUrl = urlForImage(block as any);

      return (
        <div key={block._key} className="flex justify-center my-8">
          <div className="w-full max-w-none">
            <Image
              src={imageUrl}
              alt={block.alt || 'Blog image'}
              width={800}
              height={400}
              className="w-full h-auto rounded-lg"
              style={{ objectFit: 'contain' }}
            />
          </div>
        </div>
      );
    }

    // Handle text blocks
    switch (block.style) {
      case 'h1':
        return (
          <h1 key={block._key} className="text-4xl font-bold mb-4 text-gray-900">
            {renderContent(block.children || [], block)}
          </h1>
        );
      case 'h2':
        return (
          <h2 key={block._key} className="text-2xl font-bold my-6 text-gray-900">
            {renderContent(block.children || [], block)}
          </h2>
        );
      case 'h3':
        return (
          <h3 key={block._key} className="text-xl font-bold mb-4 text-gray-900">
            {renderContent(block.children || [], block)}
          </h3>
        );
      case 'h4':
        return (
          <h4 key={block._key} className="text-lg font-bold mb-4 text-gray-900">
            {renderContent(block.children || [], block)}
          </h4>
        );
      case 'normal':
      default:
        if (block.listItem === 'bullet') {
          return (
            <li
              key={block._key}
              className={`ml-${block.level || 1} mb-2 text-gray-700 leading-relaxed`}
            >
              {renderContent(block.children || [], block)}
            </li>
          );
        }
        return (
          <p key={block._key} className="mb-6 text-gray-700 leading-relaxed">
            {renderContent(block.children || [], block)}
          </p>
        );
    }
  };

  const renderBlocks = () => {
    const result: JSX.Element[] = [];
    let currentList: JSX.Element[] = [];
    let isInsideList = false;

    blocks.forEach((block) => {
      if (block.listItem === 'bullet') {
        isInsideList = true;
        const renderedBlock = renderBlock(block);
        if (renderedBlock) {
          currentList.push(renderedBlock);
        }
      } else {
        if (isInsideList) {
          result.push(
            <ul key={`list-${block._key}`} className="list-disc pl-8 mb-10">
              {currentList}
            </ul>
          );
          currentList = [];
          isInsideList = false;
        }
        const renderedBlock = renderBlock(block);
        if (renderedBlock) {
          result.push(renderedBlock);
        }
      }
    });

    if (isInsideList) {
      result.push(
        <ul key="list-end" className="list-disc pl-8 mb-10">
          {currentList}
        </ul>
      );
    }

    return result;
  };

  return <>{renderBlocks()}</>;
};

export default BlockContent;
