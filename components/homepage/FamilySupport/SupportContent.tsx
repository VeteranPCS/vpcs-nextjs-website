import React from "react";

interface Child {
  _key: string;
  marks: string[]; // Marks applied to the text (e.g., bold, italic)
  text: string; // Text content
}

interface Block {
  children?: Child[]; 
  style: "h1" | "h2" | "h3" | "normal"; 
}

interface TextSpanProps {
  child: Child;
}

const TextSpan: React.FC<TextSpanProps> = ({ child }) => {
  // Handle text with marks (e.g., bold, italic)
  const formattedText = child.text.split("\n").map((line, index) => (
    <React.Fragment key={index}>
      {line}
      {index < child.text.split("\n").length - 1 && <br />}
    </React.Fragment>
  ));

  if (child.marks.includes("strong")) {
    return <strong className="font-bold">{formattedText}</strong>;
  } else if (child.marks.includes("em")) {
    return <em className="italic">{formattedText}</em>;
  }

  return <>{formattedText}</>;
};

interface BlockContentProps {
  block: Block;
}

const SupportContent: React.FC<BlockContentProps> = ({ block }) => {
  // Provide a default empty array if children is undefined
  const children = block.children || [];

  const renderContent = (block: Block) => {
    return children.map((child) => <TextSpan key={child._key} child={child} />);
  };

  switch (block.style) {
    case "h1":
      return <h1 className="text-4xl font-bold mb-2">{renderContent(block)}</h1>;
    case "h2":
      return <h2 className="text-2xl font-bold my-4">{renderContent(block)}</h2>;
    case "h3":
      return <h3 className="text-xl font-bold mb-2">{renderContent(block)}</h3>;
    case "normal":
    default:
      return <p className="mb-6 leading-relaxed">{renderContent(block)}</p>;
  }
};

export default SupportContent;
