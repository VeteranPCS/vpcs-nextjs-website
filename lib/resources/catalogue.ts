import type { BlogPost } from '@/lib/blog/types';

export const RESOURCE_CATEGORIES = [
  { id: 'buying-home', label: 'Buying a Home', source: 'Real Estate Insights', icon: 'home' },
  { id: 'pcs-planning', label: 'PCS Planning', source: 'PCS Help', icon: 'box' },
  { id: 'military-finance', label: 'Military Finance', source: 'Financial Guidance', icon: 'dollar' },
  { id: 'va-loan-help', label: 'VA Loan Help', source: 'VA Loan Help', icon: 'shield' },
  { id: 'duty-stations', label: 'Duty Station Guides', source: 'U.S. Military Bases', icon: 'map' },
] as const;
export type ResourceCategory = typeof RESOURCE_CATEGORIES[number]['id'];
export type Resource = { id: string; title: string; description: string; href: string; image?: string; imageAlt?: string; categories: ResourceCategory[]; keywords: string; kind: 'article' | 'tool' | 'download'; download?: 'va-guide' | 'homebuyer-guide' };
export const CHECKLIST_SLUG = 'the-ultimate-pcs-checklist-and-timeline-for-active-duty-military-personnel';
export const RESOURCE_TOOLS: Resource[] = [
  { id:'bah',title:'BAH Calculator',description:'Calculate your Basic Allowance for Housing based on rank, dependents, and location.',href:'/bah-calculator',categories:['military-finance'],keywords:'bah allowance housing calculator pay grade ZIP',kind:'tool' },
  { id:'va-calculator',title:'VA Loan Calculator',description:'Estimate your monthly payment and explore your buying power with a VA home loan.',href:'/va-loan-calculator',categories:['va-loan-help'],keywords:'mortgage payment interest loan calculator',kind:'tool' },
  { id:'bonus',title:'Move-In Bonus Calculator',description:'See how much you can receive when you buy or sell with a trusted VeteranPCS agent.',href:'/pcs-resources#move-in-bonus',categories:['buying-home'],keywords:'moving bonus cash back calculator',kind:'tool' },
];
export const RESOURCE_DOWNLOADS: Resource[] = [
  { id:'va-guide',title:'Free VA Loan Guide',description:'Understand your VA home loan benefits and the steps to home ownership.',href:'/guides#va-loan-guide',categories:['va-loan-help'],keywords:'download pdf guide',kind:'download',download:'va-guide' },
  { id:'homebuyer-guide',title:'Free First-Time Homebuyer Guide',description:'Understand the home buying process before your next move.',href:'/guides#homebuyer-guide',categories:['buying-home'],keywords:'first time home buyer download pdf guide',kind:'download',download:'homebuyer-guide' },
];
/** Use the same published blog set as the site; secondary categories count too. */
export function buildResourceCatalogue(posts: readonly BlogPost[]): Resource[] {
  return posts.map(post => ({ id:post.slug,title:post.shortTitle || post.title,description:post.description || post.metaDescription,href:`/blog/${post.slug}`,image:post.mainImage?.src,imageAlt:post.mainImage?.alt,categories:RESOURCE_CATEGORIES.filter(category => post.component===category.source || post.categories.includes(category.source)).map(category=>category.id),keywords:[post.title,post.primaryKeyword,...post.secondaryKeywords ?? [],post.component,...post.categories].filter(Boolean).join(' '),kind:'article' as const }));
}
export function categoryCounts(resources: readonly Resource[]): Record<ResourceCategory, number> {
  return Object.fromEntries(RESOURCE_CATEGORIES.map(category=>[category.id,resources.filter(resource=>resource.kind==='article' && resource.categories.includes(category.id)).length])) as Record<ResourceCategory,number>;
}
export function normalizeResourceQuery(query:string):string { return query.trim().replace(/\s+/g,' ').slice(0,160); }
export function searchResources(resources: readonly Resource[], query:string, category?:string): Resource[] {
  const phrase=normalizeResourceQuery(query).toLocaleLowerCase('en-US');
  const terms=phrase.split(' ').filter(Boolean);
  return resources.map((resource,index)=>{
    if(category && !resource.categories.includes(category as ResourceCategory)) return {resource,index,score:-1};
    const fields=[{text:resource.title,weight:8},{text:resource.description,weight:3},{text:resource.keywords,weight:4}].map(field=>({...field,text:field.text.toLocaleLowerCase('en-US')}));
    let score=0;
    for(const term of terms){const match=fields.reduce((sum,field)=>sum+(field.text.includes(term)?field.weight:0),0);if(!match)return {resource,index,score:-1};score+=match;}
    return {resource,index,score};
  }).filter(entry=>entry.score>=0).sort((a,b)=>b.score-a.score || a.index-b.index).map(entry=>entry.resource);
}
export const INSTALLATION_GUIDES = [
  ['Fort Bragg','pcs-to-fort-bragg-2026-guide'],['Fort Benning','pcs-to-fort-benning-2026-guide'],['Camp Pendleton','pcs-to-mcb-camp-pendleton-2026-guide'],['MacDill AFB','pcs-to-macdill-afb-tampa-2026-guide'],['JB Lewis-McChord','pcs-to-joint-base-lewis-mcchord-jblm-2026-guide'],['Pearl Harbor','pcs-to-joint-base-pearl-harbor-hickam-2026-guide'],
] as const;
