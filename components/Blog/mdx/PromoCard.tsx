import Image from 'next/image';
import Button from '@/components/common/Button';
import TrackedCtaLink from '@/components/common/TrackedCtaLink';

type Props = {
  headline: string;
  cta: string;
  href: string;
  image?: string;
  imageAlt?: string;
  expiresAt?: string;
};

export default function PromoCard({
  headline,
  cta,
  href,
  image,
  imageAlt,
  expiresAt,
}: Props) {
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return null;

  return (
    <div className="my-8 rounded-2xl bg-[#F8F9FA] border border-[#E5E5E5] p-6 flex flex-col md:flex-row items-center gap-6">
      {image ? (
        <div className="shrink-0">
          <Image
            src={image}
            alt={imageAlt ?? ''}
            width={160}
            height={160}
            className="rounded-xl object-cover"
          />
        </div>
      ) : null}
      <div className="flex-1 text-center md:text-left">
        <h3 className="tahoma text-xl font-bold text-[#212529] mb-3">{headline}</h3>
        <TrackedCtaLink
          href={href}
          cta={{
            ctaId: 'blog_mdx_promo_card',
            ctaIntent: 'content_or_offer_navigation',
            ctaPosition: 'mdx_body',
            ctaComponent: 'blog_mdx_promo_card',
            ctaLabel: cta,
            destination: href,
            pageType: 'blog_post',
          }}
        >
          <Button buttonText={cta} divClassName="!py-0" />
        </TrackedCtaLink>
      </div>
    </div>
  );
}
