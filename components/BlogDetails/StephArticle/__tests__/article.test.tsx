// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { BlogPost, ResolvedAuthor } from '@/lib/blog/types';
vi.mock('server-only',()=>({}));
// The image mock forwards alt while removing Next's non-DOM priority prop.
// eslint-disable-next-line @next/next/no-img-element
vi.mock('next/image',()=>({default:({priority:_priority,...props}:Record<string,unknown>)=><img {...props} alt={String(props.alt??'')}/> }));
vi.mock('next/link',()=>({default:({children,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>)=><a {...props}>{children}</a>}));
const factory=vi.hoisted(()=>vi.fn());
vi.mock('@/mdx-components',()=>({createBlogMdxComponents:(args:unknown)=>{factory(args);return args;}}));
vi.mock('next-mdx-remote/rsc',()=>({MDXRemote:({source,components}:{source:string;components:{headingIds:{id:string;text:string}[]}})=><><div data-testid="source-fragment">{source}</div>{components.headingIds.map(heading=><h2 key={heading.id} id={heading.id}>{heading.text}</h2>)}</>}));
vi.mock('@/services/salesForcePostFormsService',()=>({KeepInTouchForm:vi.fn(),homebuyerGuideForm:vi.fn(),vaLoanGuideForm:vi.fn()}));
const track=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/analytics/client',()=>({trackCtaClicked:track,trackFormStarted:vi.fn(),captureAnalyticsEvent:vi.fn(),trackFormSubmitAttempted:vi.fn(),trackFormSubmissionFailed:vi.fn(),formTrackingPayload:()=>({})}));
import StephArticle from '../StephArticle';
const blog:BlogPost={title:'An intentionally long PCS article title that retains every word without truncating relocation information',metaTitle:'PCS',metaDescription:'Guide summary',description:'Planning help',slug:'test-article',publishedAt:'2026-06-01',component:'PCS Help',categories:['PCS Help'],mainImage:{src:'/images/blog/test.webp',alt:'Article image'},author:{},content:`## Costs\n\n${'Planning a military move. '.repeat(60)}\n\n## Costs\n\n${'Prepare for the move. '.repeat(60)}`,filepath:'test.mdx'};
const fallback:ResolvedAuthor={kind:'fallback',salesforceId:null,sourceSalesforceId:null,role:'organization',active:false,matchKind:'fallback',firstName:'',lastName:'',fullName:'VeteranPCS',name:'VeteranPCS',city:null,state:null,stateSlug:null,militaryStatus:null,brokerage:null,headshotPath:null,contactHref:'/contact-agent',isAgent:false,isLender:false};
function article(author=fallback,intent:'agent'|'lender'='agent',stateSlug:string|null='texas') {return <StephArticle blog={blog} resolvedAuthor={author} stateSlug={stateSlug} intent={intent} category={{label:'PCS Help',slug:'pcs-help'}} related={[]}/>;}
beforeEach(()=>{factory.mockClear();track.mockClear();HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new Event('close'));};});
afterEach(cleanup);
describe('Steph article',()=>{
  it('keeps body completeness, duplicate heading IDs, full title and default VeteranPCS byline',()=>{
    render(article());
    expect(screen.getByRole('heading',{level:1}).textContent).toBe(blog.title);
    expect(screen.getByText('By VeteranPCS')).toBeTruthy();
    expect(screen.getAllByTestId('source-fragment').map(node=>node.textContent).join('')).toBe(blog.content);
    expect(document.getElementById('costs')).toBeTruthy();expect(document.getElementById('costs-2')).toBeTruthy();
    for(const [args] of factory.mock.calls)expect(args).toEqual(expect.objectContaining({contentSlug:blog.slug,resolvedAuthor:fallback}));
  });
  it('preserves active author attribution and lender/state routing on contextual contacts',()=>{
    const author:ResolvedAuthor={...fallback,kind:'salesforce',salesforceId:'001active',role:'lender',active:true,matchKind:'salesforceId',name:'Alex Veteran',fullName:'Alex Veteran',firstName:'Alex',isLender:true,contactHref:'/contact-lender?form=lender&fn=Alex&id=001active&state=virginia'};
    render(article(author,'lender','virginia'));
    expect(screen.getByRole('link',{name:'By Alex Veteran'}).getAttribute('href')).toContain('id=001active');
    for(const link of screen.getAllByRole('link',{name:'Find a lender in Virginia'}))expect(link.getAttribute('href')).toBe('/contact-lender?form=lender&state=virginia');
    const firstLink=screen.getAllByRole('link',{name:'Find a lender in Virginia'})[0];
    if(!firstLink)throw new Error('Missing contextual contact');
    fireEvent.click(firstLink);
    expect(track).toHaveBeenCalledWith(expect.objectContaining({content_slug:'test-article',state_slug:'virginia',partner_type:'lender',cta_id:'blog_details_find_lender',cta_position:'blog_details_cta_band',cta_component:'blog_details_cta'}));
  });
  it('places collapsible TOC before body and follows repeated heading targets',()=>{
    render(article());const mobile=screen.getByText('Table of Contents',{selector:'summary'}).closest('details');
    if(!mobile)throw new Error('Missing mobile table of contents');
    expect(mobile.compareDocumentPosition(screen.getByRole('article',{name:'Article body'}))&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const links=within(mobile).getAllByRole('link',{hidden:true});expect(links.map(link=>link.getAttribute('href'))).toEqual(['#costs','#costs-2']);
  });
  it('prefills shared guide capture, leaves it reviewable without submitting, and restores focus on close',()=>{
    render(article());const promo=screen.getByRole('region',{name:'Free homebuyer guide'});
    fireEvent.change(within(promo).getByRole('textbox',{name:'Email address'}),{target:{value:'review@example.com'}});
    const trigger=within(promo).getByRole('button',{name:'Get My Free Guide'});fireEvent.click(trigger);
    const dialog=screen.getByRole('dialog',{name:'Free First-Time Homebuyer Guide'});
    expect(within(dialog).getByRole('textbox',{name:'Email'}).getAttribute('value')).toBe('review@example.com');
    fireEvent.click(within(dialog).getByRole('button',{name:'Close'}));expect(document.activeElement).toBe(trigger);
  });
  it('keeps short articles intact and puts both promotions after their entire body',()=>{
    render(<StephArticle blog={{...blog,content:'## Short guide\n\nThe complete short article.'}} resolvedAuthor={fallback} stateSlug={null} intent="agent" category={null} related={[]}/>);
    const fragment=screen.getByTestId('source-fragment');
    expect(fragment.textContent).toBe('## Short guide\n\nThe complete short article.');
    for(const name of ['Plan your next move','Free homebuyer guide'])expect(fragment.compareDocumentPosition(screen.getByRole('region',{name}))&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('uses genuine named review records and navigates the quote carousel',()=>{
    render(article());expect(screen.getByText('Breanna Walker')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Next customer review'}));expect(screen.getByText('Hailey Jensen')).toBeTruthy();
  });
});
