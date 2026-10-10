import type { Metadata } from 'next';
import { getAllBlogs } from '@/lib/blog/mdx';
import { LIFE_RESOURCES, TRUSTED_RESOURCES } from '@/lib/content/resources';
import { buildResourceCatalogue } from '@/lib/resources/catalogue';
import StephResources from '@/components/PcsResources/StephResources/StephResources';

export const metadata: Metadata = {
  metadataBase:new URL(process.env.NEXT_PUBLIC_API_BASE_URL || 'https://veteranpcs.com'),
  title:'Military Moving Toolkit: PCS Resources & Calculators',
  description:'Find PCS checklists, installation guides, BAH and VA loan calculators, free homebuyer guides, and trusted military resources.',
  alternates:{canonical:'/pcs-resources'},
  openGraph:{type:'website',url:'/pcs-resources',images:[{url:'/opengraph/og-logo.png',width:1200,height:630,alt:'VeteranPCS'}]},
};
export default async function PcsResourcesPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  await searchParams;
  const catalogue=buildResourceCatalogue(await getAllBlogs());
  const partners=[...TRUSTED_RESOURCES,...LIFE_RESOURCES.filter(resource=>!TRUSTED_RESOURCES.some(partner=>partner.url===resource.url))].map(partner=>({id:partner._id,name:partner.name,url:partner.url,image:partner.logo.path,alt:partner.logo.alt}));
  return <StephResources articles={catalogue} partners={partners}/>;
}
