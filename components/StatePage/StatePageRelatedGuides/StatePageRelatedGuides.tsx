import Link from 'next/link';
import type { InternalLinkRegistryPost } from '@/lib/blog/registry';

type Props = {
  stateName: string;
  guides: InternalLinkRegistryPost[];
};

export default function StatePageRelatedGuides({ stateName, guides }: Props) {
  if (guides.length === 0) return null;

  return (
    <section className="bg-white py-14 md:py-16">
      <div className="container mx-auto px-5 md:px-0">
        <div className="max-w-3xl">
          <p className="tahoma text-sm font-bold uppercase tracking-[1px] text-[#A81F23]">
            PCS resources
          </p>
          <h2 className="tahoma mt-2 text-3xl font-bold text-[#292F6C] md:text-[38px]">
            Guides for {stateName}
          </h2>
          <p className="roboto mt-3 text-base leading-7 text-[#495057] md:text-lg">
            Read state-specific PCS, base, housing, and VA loan guides before you choose a neighborhood.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={guide.url}
              className="group flex min-h-[210px] flex-col justify-between rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] p-5 transition hover:-translate-y-1 hover:border-[#A81F23] hover:bg-white hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A81F23]"
            >
              <div>
                <p className="tahoma text-xs font-bold uppercase tracking-[1px] text-[#6C757D]">
                  {guide.component}
                </p>
                <h3 className="tahoma mt-3 text-xl font-bold leading-snug text-[#292F6C] group-hover:text-[#A81F23]">
                  {guide.title}
                </h3>
                {guide.description && (
                  <p className="roboto mt-3 line-clamp-3 text-sm leading-6 text-[#495057]">
                    {guide.description}
                  </p>
                )}
              </div>
              <span className="tahoma mt-5 text-sm font-bold text-[#A81F23]">
                Read guide
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
