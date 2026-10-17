import 'server-only';
import { PARTNER_ASSET_SIZES } from './partnerAssets';
import { REAL_STATE_AGENTS } from '@/lib/content/homepage';
import trustedResources from '@/content/_data/site/trusted_resources.json';
import lifeResources from '@/content/_data/site/life_resources.json';

export type HomePartner = { id: string; name: string; url: string; image: string; alt: string; width: number; height: number };
const assetRoot = '/images/steph/vet-675/partners/';
const suppliedMarks: Record<string, string> = {
  '20acd6f1-0c57-4f7c-ae45-e8a440f3d8cf': 'squared-away.webp', '310a4396-40db-486c-9f3d-534e0787f66b': 'porch.webp', '4ad40bc4-092f-4cb1-95cd-d447864ce034': 'instant-teams.webp',
  '552fe94f-d649-41e5-8472-e178d6d618ec': 'bbb.webp', '8aab75be-356e-4c4c-b8dc-dc00341e7b08': 'we-are-the-mighty.webp',
  'c7e327ac-df3f-4b71-95f1-1a542bffbc35': 'stars-and-stripes.webp', 'e8d3a8c7-c3de-4d76-a298-c7fd08ffe33e': 'associated-press.webp', 'efc9dba4-bda2-4fa6-b991-fddac84a08ee': 'yahoo-finance.webp',
};
const originals: HomePartner[] = REAL_STATE_AGENTS.map(partner => ({
  id: partner._id, name: partner.title === 'Hire Our Heros' ? 'Hiring Our Heroes' : partner.title.trim(),
  url: partner.url, image: suppliedMarks[partner._id] ? assetRoot + suppliedMarks[partner._id] : partner.mainImage.path,
  alt: partner.mainImage.alt, width: PARTNER_ASSET_SIZES[suppliedMarks[partner._id] ?? '']?.width ?? partner.mainImage.width, height: PARTNER_ASSET_SIZES[suppliedMarks[partner._id] ?? '']?.height ?? partner.mainImage.height,
}));
// The original thirteen retain their source order. Append each distinct organization
// by its stable content ID; Hiring Our Heroes and Hire Heroes USA are separate groups.
const additions = [
  { id: '842ce5ac-55d7-408f-964d-ea10bd4a9650', name: 'Hire Heroes USA', mark: 'hire-heroes-usa.svg' },
  { id: '5a0b9b72-1531-4846-bd89-6da0acd87946', name: 'Spouse-ly', mark: 'spouse-ly.webp' },
  { id: 'cc78cdbd-b12f-43e0-a10d-3be2ed37ef5c', name: 'Veteran Owned Business', mark: 'veteran-owned-business.webp' },
  { id: 'b0aa5318-4cde-4f9f-8c73-2cd68f050a06', name: 'Military Spouse Chamber of Commerce', mark: 'mscc.webp' },
].map(({ id, name, mark }): HomePartner => {
  const source = [...trustedResources, ...lifeResources].find(partner => partner._id === id);
  if (!source?.url) throw new Error(`Homepage partner ${id} requires a verified URL`);
  return { id, name, url: source.url, image: assetRoot + mark, alt: name, width: PARTNER_ASSET_SIZES[mark]?.width ?? source.logo.width, height: PARTNER_ASSET_SIZES[mark]?.height ?? source.logo.height };
});
export const HOME_PARTNERS: HomePartner[] = [...originals, ...additions];
