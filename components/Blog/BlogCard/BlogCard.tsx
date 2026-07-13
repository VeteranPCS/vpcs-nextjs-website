import Image from "next/image";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";
import { formatDate } from "@/utils/helper";
import {
  buildBlogCardCta,
  type BlogCardCtaContext,
  type BlogCardData,
} from "@/lib/blog/cards";

export type BlogCardVariant = "default" | "horizontal" | "compact";

type Props = {
  data: BlogCardData;
  variant?: BlogCardVariant;
  cta: BlogCardCtaContext;
};

const FALLBACK_IMAGE = "/assets/BlogpostImage.png";

function Kicker({ data }: { data: BlogCardData }) {
  if (!data.publishedAt && !data.readTimeMinutes) return null;
  return (
    <p className="text-[#6C757D] lora text-sm font-normal">
      {data.publishedAt ? formatDate(data.publishedAt) : null}
      {data.publishedAt && data.readTimeMinutes ? " · " : null}
      {data.readTimeMinutes ? `${data.readTimeMinutes} min read` : null}
    </p>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <div className="rounded-lg bg-white/15 px-4 py-2 text-white roboto text-xs font-bold">
      {label}
    </div>
  );
}

function CardBody({ data }: { data: BlogCardData }) {
  return (
    <div className="p-5 bg-[#FFFFFF] flex-1">
      <Kicker data={data} />
      <h3 className="text-[#495057] text-lg font-bold my-4 line-clamp-2">
        {data.title}
      </h3>
      {data.description ? (
        <p className="text-[#6C757D] roboto text-sm font-normal line-clamp-3">
          {data.description}
        </p>
      ) : null}
      {data.authorName ? (
        <>
          <p className="bg-[#E5E5E5] p-[1px] w-full mt-5"></p>
          <p className="text-[#495057] roboto text-sm font-normal mt-5">
            By {data.authorName}
          </p>
        </>
      ) : null}
    </div>
  );
}

export default function BlogCard({ data, variant = "default", cta }: Props) {
  const href = `/blog/${data.slug}`;
  const builtCta = buildBlogCardCta(cta, data.slug);
  const imageSrc = data.image?.src ?? FALLBACK_IMAGE;
  const imageAlt = data.image?.alt ?? data.title;

  if (variant === "compact") {
    return (
      <TrackedCtaLink href={href} className="block h-full" cta={builtCta}>
        <div className="p-5 bg-[#FFFFFF] h-full">
          {data.badge ? (
            <p className="text-[#292F6C] roboto text-xs font-bold uppercase">
              {data.badge}
            </p>
          ) : null}
          <h3 className="text-[#495057] text-base font-bold my-2 line-clamp-2">
            {data.title}
          </h3>
          <Kicker data={data} />
        </div>
      </TrackedCtaLink>
    );
  }

  if (variant === "horizontal") {
    return (
      <TrackedCtaLink href={href} className="block h-full" cta={builtCta}>
        <div className="flex md:flex-row flex-col h-full">
          <div className="relative md:w-2/5 shrink-0 min-h-[200px]">
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              sizes="(min-width: 768px) 40vw, 100vw"
              className="object-cover"
            />
            {data.badge ? (
              <div className="absolute top-4 right-4 max-w-[calc(100%-2rem)]">
                <Badge label={data.badge} />
              </div>
            ) : null}
          </div>
          <CardBody data={data} />
        </div>
      </TrackedCtaLink>
    );
  }

  return (
    <TrackedCtaLink href={href} className="block h-full" cta={builtCta}>
      <div className="flex flex-col h-full">
        <div className="relative">
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={310}
            height={280}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 100vw"
            className="w-full h-[280px] object-cover"
          />
          {data.badge ? (
            <div className="absolute top-4 right-4 max-w-[calc(100%-2rem)]">
              <Badge label={data.badge} />
            </div>
          ) : null}
        </div>
        <CardBody data={data} />
      </div>
    </TrackedCtaLink>
  );
}
