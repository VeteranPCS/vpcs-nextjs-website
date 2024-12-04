const TextSpan = ({ child }) => {
  // Handle marked text (like strong/bold)
  if (child.marks && child.marks.includes('strong')) {
    return <strong className="font-bold">{child.text}</strong>;
  }
  return <>{child.text}</>;
};

const BlockContent = ({ block }) => {
  if (!block || !block.children) return null;

  const renderContent = () => {
    return block.children.map((child, index) => (
      <TextSpan key={child._key || index} child={child} />
    ));
  };

  switch (block.style) {
    case 'h1':
      return (
        <h1 className="text-4xl font-bold mb-4 text-gray-900">
          {renderContent()}
        </h1>
      );
    case 'h2':
      return (
        <h2 className="text-2xl font-bold my-6 text-gray-900">
          {renderContent()}
        </h2>
      );
    case 'h3':
      return (
        <h3 className="text-xl font-bold mb-4 text-gray-900">
          {renderContent()}
        </h3>
      );
    case 'normal':
    default:
      return (
        <p className="mb-6 text-gray-700 leading-relaxed">
          {renderContent()}
        </p>
      );
  }
};

export default BlockContent;