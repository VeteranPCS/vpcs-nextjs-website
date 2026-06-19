import Image from 'next/image';

type Props = {
  id?: string;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  defaultQuery?: string;
};

export default function BlogSearchForm({
  id = 'blog-search-query',
  className = '',
  inputClassName = '',
  buttonClassName = '',
  defaultQuery = '',
}: Props) {
  return (
    <form className={`flex w-full ${className}`} method="GET" action="/blog-search">
      <label className="sr-only" htmlFor={id}>Search VeteranPCS guides</label>
      <input
        id={id}
        type="search"
        name="query"
        defaultValue={defaultQuery}
        placeholder="Search guides"
        className={`min-h-11 w-full border bg-[#F9F9F9] border-gray-300 rounded-l-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#292F6C] focus:border-[#292F6C] ${inputClassName}`}
      />
      <button
        type="submit"
        aria-label="Search guides"
        className={`min-h-11 bg-[#292F6C] hover:bg-[#20275c] text-white px-4 py-3 rounded-r-md focus:outline-none focus:ring-2 focus:ring-[#292F6C] focus:ring-offset-2 ${buttonClassName}`}
      >
        <Image src="/icon/search.svg" width={20} height={20} alt="" loading="eager" />
      </button>
    </form>
  );
}
