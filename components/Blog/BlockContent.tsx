import React from 'react';

interface Child {
  _key: string;
  marks: string[]; // Assuming marks is an array of strings (e.g., ['strong', 'italic'])
  text: string; // The text content of the child
}

interface Block {
  _key: string;
  children: Child[];
  style: 'h1' | 'h2' | 'h3' | 'normal'; // Explicitly define the style types
  listItem?: 'bullet'; // Optional property for list items
  level?: number; // Optional property for list nesting level
}

interface TextSpanProps {
  child: Child;
}

const TextSpan: React.FC<TextSpanProps> = ({ child }) => {
  if (child.marks && child.marks.includes('strong')) {
    return <strong className="font-bold">{child.text}</strong>;
  }
  return <>{child.text}</>;
};

interface BlockContentProps {
  blocks: Block[];
}

const BlockContent: React.FC<BlockContentProps> = ({ blocks }) => {
  const renderContent = (children: Child[]) => {
    return children.map((child) => (
      <TextSpan key={child._key} child={child} />
    ));
  };

  const renderBlock = (block: Block) => {
    switch (block.style) {
      case 'h1':
        return (
          <h1 key={block._key} className="text-4xl font-bold mb-4 text-gray-900">
            {renderContent(block.children)}
          </h1>
        );
      case 'h2':
        return (
          <h2 key={block._key} className="text-2xl font-bold my-6 text-gray-900">
            {renderContent(block.children)}
          </h2>
        );
      case 'h3':
        return (
          <h3 key={block._key} className="text-xl font-bold mb-4 text-gray-900">
            {renderContent(block.children)}
          </h3>
        );
      case 'normal':
      default:
        if (block.listItem === 'bullet') {
          return (
            <li
              key={block._key}
              className={`ml-${block.level || 1} mb-2 text-gray-700 leading-relaxed`}
            >
              {renderContent(block.children)}
            </li>
          );
        }
        return (
          <p key={block._key} className="mb-6 text-gray-700 leading-relaxed">
            {renderContent(block.children)}
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
        currentList.push(renderBlock(block));
      } else {
        if (isInsideList) {
          result.push(
            <ul key={`list-${block._key}`} className="list-disc list-none pl-8">
              {currentList}
            </ul>
          );
          currentList = [];
          isInsideList = false;
        }
        result.push(renderBlock(block));
      }
    });

    if (isInsideList) {
      result.push(
        <ul key="list-end" className="list-disc list-none pl-8">
          {currentList}
        </ul>
      );
    }

    return result;
  };

  return <>{renderBlocks()}</>;
};

export default BlockContent;
