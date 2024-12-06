import React from 'react';

interface Child {
  _key: string;
  marks: string[];  // Assuming marks is an array of strings (e.g., ['strong', 'italic'])
  text: string;     // The text content of the child
}

interface Block {
  children: Child[];
  style: 'h1' | 'h2' | 'h3' | 'normal'; // Explicitly define the style types
}

interface TextSpanProps {
  child: Child;
}

const TextSpan: React.FC<TextSpanProps> = ({ child }) => {
  // Handle marked text (like strong/bold)
  if (child.marks && child.marks.includes('strong')) {
    return <strong className="font-bold">{child.text}</strong>;
  }
  return <>{child.text}</>;
};

interface BlockContentProps {
  block: Block;
}

const BlockContent: React.FC<BlockContentProps> = ({ block }) => {
  if (!block || !block.children) return null;

  const renderContent = (block: Block) => {
    return block.children.map((child) => (
      <TextSpan key={child._key} child={child} />
    ));
  };

  switch (block.style) {
    case 'h1':
      return (
        <h1 className="text-4xl font-bold mb-4 text-gray-900">
          {renderContent(block)}
        </h1>
      );
    case 'h2':
      return (
        <h2 className="text-2xl font-bold my-6 text-gray-900">
          {renderContent(block)}
        </h2>
      );
    case 'h3':
      return (
        <h3 className="text-xl font-bold mb-4 text-gray-900">
          {renderContent(block)}
        </h3>
      );
    case 'normal':
    default:
      return (
        <p className="mb-6 text-gray-700 leading-relaxed">
          {renderContent(block)}
        </p>
      );
  }
};

export default BlockContent;