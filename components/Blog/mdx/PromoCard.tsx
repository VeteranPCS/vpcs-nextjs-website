import Image from 'next/image';
import Link from 'next/link';
import Button from '@/components/common/Button';

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
        <Link href={href}>
          <Button buttonText={cta} divClassName="!py-0" />
        </Link>
      </div>
    </div>
  );
}
