'use client';
import { useState } from 'react';
import Image from 'next/image';
import type { Review } from '@/components/homepage/ReviewTestimonial/ReviewTestimonial';
import { SectionStar } from './HomeMap';
import HomeCta from './HomeCta';
import styles from './StephHomepage.module.css';
const stars = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
function Quote({ review }: { review: Review }) {
  const text = review.comment ?? '';
  const excerpt = text.length > 290 ? `${text.slice(0, 290).replace(/\s+\S*$/, '')}…` : text;
  return <><span className={styles.quoteMark} aria-hidden="true">“</span><blockquote>{excerpt}</blockquote>{text.length > 290 && <details className={styles.fullReview}><summary>Read full review</summary><p>{text}</p></details>}<p className={styles.reviewStars} aria-label={`${stars[review.starRating]} out of 5 stars`}>{'★'.repeat(stars[review.starRating])}</p><strong>{review.reviewer.displayName}</strong><p className={styles.reviewSource}>Google review from {review.reviewer.displayName}</p></>;
}
export default function HomeReviews({ reviews }: { reviews: Review[] }) {
  const [index, setIndex] = useState(0);
  const review = reviews[index];
  return <section className={styles.reviews} aria-labelledby="home-reviews-title"><SectionStar /><p className={styles.redEyebrow}>Real Military Families. Real Results.</p><h2 id="home-reviews-title">Success Stories That <span className={styles.brush}>Inspire</span></h2><p className={styles.sectionIntro}>We’re honored to help military families buy and sell homes<br className={styles.desktopOnly} /> and give back along the way.</p>
    {review ? <><div className={styles.carousel} aria-roledescription="carousel" aria-label="Customer reviews"><button className={styles.carouselArrow} aria-label="Previous review" onClick={() => setIndex((index + reviews.length - 1) % reviews.length)}>←</button><article className={styles.featuredReview} aria-live="polite"><figure className={styles.reviewArt}><Image src="/images/redesign/home-story-family.webp" width={800} height={560} alt="VeteranPCS military family receiving a move-in bonus check" loading="eager" /><figcaption>VeteranPCS family photo</figcaption></figure><div className={styles.featuredQuote}><Quote review={review} /></div></article><button className={styles.carouselArrow} aria-label="Next review" onClick={() => setIndex((index + 1) % reviews.length)}>→</button></div><div className={styles.carouselDots}>{reviews.slice(0, 6).map((item, position) => <button key={item.reviewId} aria-label={`Show review ${position + 1}`} aria-current={position === index ? 'true' : undefined} onClick={() => setIndex(position)} />)}</div><div className={styles.quoteGrid}>{reviews.slice(1, 4).map((item) => <article key={item.reviewId}><Quote review={item} /></article>)}</div></> : <p>Read stories from the VeteranPCS community.</p>}
    <HomeCta href="/stories" id="homepage_testimonials" intent="stories_navigation" className={styles.mobileOnly}>Testimonials</HomeCta>
  </section>;
}
