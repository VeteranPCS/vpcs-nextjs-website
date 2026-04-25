import Image from 'next/image';
import Link from 'next/link';
import Button from '@/components/common/Button';
import { resolveAuthor } from '@/lib/blog/authors';
import { buildContactCtaHref } from '@/lib/contactAgentUrl';
import type { FrontmatterAuthor } from '@/lib/blog/types';

const VPCS_FALLBACK = {
  logo: '/logo-stacked.png',
  logoWidth: 1884,
  logoHeight: 1172,
  name: 'VeteranPCS',
  location: 'Nationwide',
  militaryStatus: 'Veteran Agents',
  brokerage: 'Solid Oak Realty',
} as const;

type Props = {
  frontmatterAuthor: FrontmatterAuthor | null | undefined;
  variant?: 'card' | 'inline';
};

export default async function AuthorByline({
  frontmatterAuthor,
  variant = 'card',
}: Props) {
  const author = await resolveAuthor(frontmatterAuthor ?? null);

  if (!author) {
    if (variant === 'inline') {
      return (
        <span className="inline-flex items-center gap-2">
          <Image
            src={VPCS_FALLBACK.logo}
            alt={VPCS_FALLBACK.name}
            width={32}
            height={32}
            className="object-contain"
          />
          <span>By {VPCS_FALLBACK.name}</span>
        </span>
      );
    }

    return (
      <div className="bg-[#E5E5E5] rounded-2xl p-10 text-center flex flex-col items-center max-w-xs w-full mx-auto mb-8 lg:mb-0">
        <div className="flex justify-center items-center bg-white rounded h-[150px] w-[150px] p-3">
          <Image
            width={VPCS_FALLBACK.logoWidth}
            height={VPCS_FALLBACK.logoHeight}
            src={VPCS_FALLBACK.logo}
            alt={VPCS_FALLBACK.name}
            className="max-w-full max-h-full w-auto h-auto object-contain"
          />
        </div>
        <p className="text-[#495057] roboto text-sm font-normal mt-5">
          <b className="text-[#495057] tahoma">{VPCS_FALLBACK.name}</b>
          <br />
          {VPCS_FALLBACK.location}
          <br />
          <b className="text-[#495057]">{VPCS_FALLBACK.militaryStatus}</b>
          <br />
          <b className="text-[#495057]">{VPCS_FALLBACK.brokerage}</b>
        </p>
      </div>
    );
  }

  const displayName = author.fullName;

  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-2">
        {author.headshotPath && (
          <Image
            src={author.headshotPath}
            alt={displayName}
            width={32}
            height={32}
            className="rounded-full object-cover"
          />
        )}
        <span>By {displayName}</span>
      </span>
    );
  }

  const showCta = Boolean(author.salesforceId && author.active);
  const ctaHref = buildContactCtaHref({
    firstName: author.firstName,
    salesforceId: author.salesforceId,
    stateSlug: author.stateSlug,
  });

  return (
    <div className="bg-[#E5E5E5] rounded-2xl p-10 text-center flex flex-col items-center max-w-xs w-full mx-auto mb-8 lg:mb-0">
      <div className="flex justify-center w-full">
        <Image
          width={150}
          height={150}
          src={author.headshotPath ?? VPCS_FALLBACK.logo}
          alt={displayName}
          className="w-[150px] h-[150px] object-cover rounded"
        />
      </div>
      <p className="text-[#495057] roboto text-sm font-normal mt-5">
        <b className="text-[#495057] tahoma">{displayName}</b>
        {author.city && author.state ? (
          <>
            <br />
            {author.city}, {author.state}
          </>
        ) : null}
        {author.militaryStatus ? (
          <>
            <br />
            <b className="text-[#495057]">{author.militaryStatus}</b>
          </>
        ) : null}
        {author.brokerage ? (
          <>
            <br />
            <b className="text-[#495057]">{author.brokerage}</b>
          </>
        ) : null}
      </p>
      {showCta ? (
        <div className="w-full flex justify-center mt-4">
          <Link href={ctaHref}>
            <Button buttonText="Get in Touch" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
