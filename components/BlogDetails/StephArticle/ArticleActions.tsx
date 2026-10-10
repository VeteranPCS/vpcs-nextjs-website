'use client';
import { useId, useState } from 'react';
import LeadCaptureDialog from '@/components/redesign/LeadCaptureDialog';
import type { TocHeading } from '@/lib/blog/mdx';
import styles from './StephArticle.module.css';
export function ArticleCapture({ kind='newsletter', button='Subscribe', compact=false }: { kind?:'newsletter'|'homebuyer-guide'; button?:string; compact?:boolean }) {
  const [email, setEmail] = useState(''); const id=useId();
  return <div className={`${styles.capture} ${compact ? styles.compactCapture : ''}`}><label htmlFor={id} className={styles.srOnly}>Email address</label><input id={id} value={email} onChange={event=>setEmail(event.target.value)} type="email" autoComplete="email" maxLength={200} placeholder="Enter your email address"/><LeadCaptureDialog key={email} kind={kind} initialEmail={email} triggerLabel={button} className={styles.button}/></div>;
}
export function ArticleToc({ headings, mobile=false }: { headings:TocHeading[]; mobile?:boolean }) {
  if (!headings.length) return null;
  const list=<ol>{headings.map(heading=><li key={heading.id}><a href={`#${heading.id}`}>{heading.text}</a></li>)}</ol>;
  return mobile ? <details className={styles.mobileToc}><summary>Table of Contents</summary><nav aria-label="Article contents">{list}</nav></details> : <nav className={styles.desktopToc} aria-label="Table of Contents"><h2>Table of Contents</h2>{list}</nav>;
}
export function ArticleShare({ title, url, image }: { title:string; url:string; image:string }) {
  const encoded=encodeURIComponent(url), text=encodeURIComponent(title);
  const links=[['Facebook',`https://www.facebook.com/sharer/sharer.php?u=${encoded}`,'f'],['X',`https://twitter.com/intent/tweet?url=${encoded}&text=${text}`,'𝕏'],['LinkedIn',`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,'in'],['Pinterest',`https://pinterest.com/pin/create/button/?url=${encoded}&media=${encodeURIComponent(image)}&description=${text}`,'p'],['Email',`mailto:?subject=${text}&body=${encoded}`,'✉']] as const;
  return <div className={styles.share}><strong>Share this article:</strong>{links.map(([name,href,symbol])=><a key={name} href={href} aria-label={`Share by ${name}`} target={name==='Email'?undefined:'_blank'} rel={name==='Email'?undefined:'noopener noreferrer'}>{symbol}</a>)}</div>;
}
type Quote={name:string; text:string};
export function ArticleTestimonial({ quotes }: { quotes:Quote[] }) {
  const [index,setIndex]=useState(0);const quote=quotes[index];if(!quote)return null;
  return <section className={styles.testimonial} aria-label="Customer reviews" aria-roledescription="carousel"><button aria-label="Previous customer review" onClick={()=>setIndex((index+quotes.length-1)%quotes.length)}>‹</button><div className={styles.quote} aria-live="polite"><span aria-hidden="true" className={styles.avatar}>{quote.name.charAt(0)}</span><div><blockquote>“{quote.text}”</blockquote><strong>{quote.name}</strong><p>Google review</p></div></div><button aria-label="Next customer review" onClick={()=>setIndex((index+1)%quotes.length)}>›</button></section>;
}
