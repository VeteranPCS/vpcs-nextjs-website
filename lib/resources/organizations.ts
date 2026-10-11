export type MilitaryResource = {id:string;name:string;url?:string;image:string;alt?:string};
// Source organization order; links are resources, not partnership endorsements.
export const FEATURED_MILITARY_RESOURCES: readonly MilitaryResource[] = [
 {id:'aee894f2-1afd-484f-8b66-61f1882c39d1',name:'Military OneSource',url:'https://www.militaryonesource.mil/',image:'/images/content/trusted-resources/military-one-source.webp'},
 {id:'84919ab3-5db4-4f1a-a57b-bf34a3833df9',name:'Hiring Our Heroes',url:'https://www.hiringourheroes.org/',image:'/images/content/real-state-agents/hiring-our-heros.webp'},
 {id:'b0aa5318-4cde-4f9f-8c73-2cd68f050a06',name:'Military Spouse Chamber of Commerce',url:'https://milspousechamber.org/',image:'/images/content/life-resources/movinglifeimg1.webp'},
 {id:'f45671c3-bcbe-47f4-973a-4d0d4c79c5cc',name:'Bunker Labs',url:'https://ivmf.syracuse.edu/bunker-labs/',image:'/images/content/life-resources/f45671c3-bcbe-47f4-973a-4d0d4c79c5cc-logo.webp',alt:'Bunker Labs — programs now part of IVMF'},
 {id:'uso',name:'USO',url:'https://www.uso.org/',image:'/images/redesign/resources-organization-uso.svg'},
];
const canonicalUrl=(url?:string)=>url?.replace(/\/$/,'').toLowerCase();
export function combineMilitaryResources(existing:readonly MilitaryResource[]):MilitaryResource[]{
 const combined=[...FEATURED_MILITARY_RESOURCES];
 for(const resource of existing){
  if(!combined.some(item=>item.id===resource.id || Boolean(resource.url && canonicalUrl(item.url)===canonicalUrl(resource.url))))combined.push(resource);
 }
 return combined;
}
