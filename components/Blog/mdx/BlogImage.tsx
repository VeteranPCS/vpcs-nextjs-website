import Image from 'next/image';

type Props = {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
};

export default function BlogImage({
  src,
  alt,
  caption,
  width = 800,
  height = 450,
}: Props) {
  return (
    <figure className="my-6">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes="(min-width: 1536px) 1200px, (min-width: 1280px) 990px, 100vw"
        className="w-full h-auto rounded-xl object-cover"
      />
      {caption ? (
        <figcaption className="roboto text-sm text-[#6C757D] text-center mt-2">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
