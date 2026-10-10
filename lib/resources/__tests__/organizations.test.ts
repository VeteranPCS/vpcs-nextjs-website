import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {expect,it} from 'vitest';
import {combineMilitaryResources,FEATURED_MILITARY_RESOURCES} from '../organizations';
it('source organizations have genuine local logo files and official destinations',()=>{
 expect(FEATURED_MILITARY_RESOURCES.map(item=>item.name)).toEqual(['Military OneSource','Hiring Our Heroes','Military Spouse Chamber of Commerce','Bunker Labs','USO']);
 for(const item of FEATURED_MILITARY_RESOURCES)expect(existsSync(join(process.cwd(),'public',item.image))).toBe(true);
 expect(FEATURED_MILITARY_RESOURCES.find(item=>item.name==='Bunker Labs')?.url).toBe('https://ivmf.syracuse.edu/bunker-labs/');
});
it('expansion preserves existing resources while replacing duplicates by ID or canonical destination',()=>{
 const existing=[{id:FEATURED_MILITARY_RESOURCES[0]!.id,name:'Old missing-link label',image:'/old.webp'},{id:'duplicate',name:'Duplicate',url:'https://www.hiringourheroes.org',image:'/duplicate.webp'},{id:'other',name:'Existing business',url:'https://example.org/',image:'/business.webp'}];
 const combined=combineMilitaryResources(existing);
 expect(combined).toHaveLength(6);expect(combined.filter(item=>item.name==='Existing business')).toHaveLength(1);expect(combined.find(item=>item.name==='Military OneSource')?.url).toBeTruthy();expect(combined.some(item=>item.id==='duplicate')).toBe(false);
});

it('USO uses the official self-contained vector rather than a PDF logo crop',()=>{
 const asset=FEATURED_MILITARY_RESOURCES.find(item=>item.name==='USO')!.image;expect(asset).toBe('/images/redesign/resources-organization-uso.svg');
 const svg=readFileSync(join(process.cwd(),'public',asset),'utf8');expect(svg).toContain('viewBox="0 0 502.9 276.9"');expect(svg).not.toMatch(/<script|(?:href|src)=/i);
});
