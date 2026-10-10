// @vitest-environment jsdom
import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const navigation=vi.hoisted(()=>({query:'',push:vi.fn(),replace:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>navigation,useSearchParams:()=>new URLSearchParams(navigation.query)}));
vi.mock('next/image',()=>({default:({alt}: {alt:string})=><span role="img" aria-label={alt}/> }));
vi.mock('next/link',()=>({default:({children,href,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>)=><a href={href} {...props}>{children}</a>}));
vi.mock('@/components/redesign/LeadCaptureDialog',()=>({default:({triggerLabel}:{triggerLabel:string})=><button>{triggerLabel}</button>}));
vi.mock('@/lib/analytics/client',()=>({captureAnalyticsEvent:vi.fn()}));
import StephResources from '../StephResources';
afterEach(cleanup);
beforeEach(()=>{navigation.query='';navigation.push.mockReset();navigation.replace.mockReset();window.location.hash='';});
it('submits the visible native value through unrelated rerenders without a React change event',()=>{
 render(<StephResources articles={[]} partners={[]}/>);
 const input=screen.getByRole('searchbox') as HTMLInputElement;
 input.value='PCS checklist';
 fireEvent.click(screen.getByRole('button',{name:'See My Bonus'}));
 expect(input.value).toBe('PCS checklist');
 fireEvent.submit(input.form!);
 expect(navigation.push).toHaveBeenLastCalledWith('/pcs-resources?q=PCS+checklist#resource-library',{scroll:true});
});
it('updates the field for query and category navigation, and reset restores focus',()=>{
 const view=render(<StephResources articles={[]} partners={[]}/>);
 const input=screen.getByRole('searchbox') as HTMLInputElement;
 input.value='unsent draft';
 navigation.query='q=VA+loan';view.rerender(<StephResources articles={[]} partners={[]}/>);
 expect(input.value).toBe('VA loan');
 navigation.query='category=military-finance';view.rerender(<StephResources articles={[]} partners={[]}/>);
 expect(input.value).toBe('');
 input.value='second draft';fireEvent.click(screen.getByRole('button',{name:'Reset search and filters'}));
 expect(input.value).toBe('');expect(document.activeElement).toBe(input);
});
