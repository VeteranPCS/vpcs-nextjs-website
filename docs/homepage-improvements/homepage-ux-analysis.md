# VeteranPCS Homepage UX Analysis & Recommendations

## Executive Summary

Analysis Date: February 2026
URL Analyzed: https://www.veteranpcs.com/

**Problem Statement:** Of approximately 1,200 monthly visits to the homepage, 866 users (72%) exit directly from the homepage without exploring further. This document provides findings from a comprehensive UX review and actionable recommendations for implementation.

---

## Analytics Context

### Key Metrics (January 2026)
- Homepage Sessions: ~1,200
- Homepage Exits: 866
- Exit Rate: ~72%

### Top Exit Destinations (Users Leaving Homepage For)
| Page | Exits |
|------|-------|
| /blog/what-military-bases-are-in-california | 55 |
| /blog/what-military-bases-are-in-georgia | 46 |
| /blog/what-military-bases-are-in-alaska | 42 |
| /bah-calculator | 41 |
| /blog/what-military-bases-are-in-florida | 29 |
| /blog/what-military-bases-are-in-new-york | 28 |
| /blog/what-military-bases-are-in-north-carolina | 27 |
| /blog/alabama-military-bases | 25 |
| /blog/what-military-bases-are-in-minnesota | 24 |

**Key Insight:** Users are actively seeking location-specific PCS information. The blog content about military bases is highly valued but not surfaced on the homepage.

---

## Current Homepage Structure

### Above the Fold
- Logo + Navigation (About, How It Works, Impact, Blog, PCS Resources, Contact)
- "$553,288 Given Back to Military Families" badge (top right)
- Hero: "Together, We'll Make It Home."
- Subheading: "Veteran & Military Spouse Real Estate Agents and VA Loan Experts You Can Trust"
- Value props: ✓ Free To Use ✓ Get Cash Back
- Primary CTA: "Find An Agent" button
- Hero image: Military family with oversized check showing "Move-In Bonus"

### Page Sections (in order)
1. Interactive US Map - "Buying or Selling?" state selector
2. "Don't want to browse? Find an Agent For Me" CTA
3. Features & Partners logos carousel
4. Impact stats ($553,288+ Savings, $196M+ Volume, $54,800 Donated)
5. Photo gallery of families with bonus checks
6. Estimated VeteranPCS Bonus Calculator (slider tool)
7. "We've got you covered" - 6 card links (Mission, Impact, VA Loan, How It Works, Stories, Resources)
8. "Support our veteran community" section (repeats value props)
9. "How VeteranPCS Works" - 3 cards (Agents, VA Loan, Bonus)
10. Testimonials carousel (50+ reviews, auto-cycling)
11. "Together we'll make it home" - VA Loan section
12. "Support our veteran community" (duplicate section)
13. "Why VeteranPCS" icons section
14. "Are you an agent?" signup CTA
15. "Skills to share" internship CTA
16. Newsletter signup form
17. Footer with state links

---

## Identified Issues

### Issue 1: Information Overload
**Severity: High**

The page contains excessive content that overwhelms users:
- 50+ testimonials in an auto-cycling carousel
- Multiple duplicate sections ("Support our veteran community" appears twice)
- 17+ distinct content sections
- Users likely feel they've absorbed enough information without needing to take action

**Evidence:** High exit rate suggests users either get what they need or become overwhelmed.

### Issue 2: Mismatch Between User Intent and Primary CTA
**Severity: High**

The primary CTA "Find An Agent" assumes users are ready to commit. However, analytics show users are in research mode (seeking blog content about military bases by state).

**Evidence:** Top exit destinations are informational blog posts, not action pages.

### Issue 3: Missing Lead Capture for Research-Stage Visitors
**Severity: High**

No mechanism exists to capture leads who aren't ready to "Find An Agent":
- No downloadable resources (PCS checklists, guides)
- No email capture until footer
- No "Learn More" alternative paths

**Evidence:** Users exit to find information elsewhere rather than being captured on-site.

### Issue 4: PCS-Specific Content Not Surfaced
**Severity: Medium**

Despite "PCS" being in the brand name:
- The term is never defined for newer service members
- No PCS timeline or urgency messaging
- Popular PCS location content (blog posts) not accessible from homepage
- No state-specific entry points despite having state pages

**Evidence:** Users search externally for state-specific content that exists on the site.

### Issue 5: Bonus Calculator Buried Mid-Page
**Severity: Medium**

The "Estimated VeteranPCS Bonus" calculator is a compelling interactive tool but appears only after significant scrolling. This tool could be a powerful engagement mechanism if more prominent.

### Issue 6: Testimonials Section Too Long
**Severity: Medium**

The testimonials carousel contains 50+ reviews with navigation arrows. While social proof is valuable, this creates:
- Slow page performance
- Decision fatigue
- Impression of "marketing-heavy" rather than information-focused

### Issue 7: No FAQ Section
**Severity: Medium**

Common questions are not addressed on the homepage:
- "Is this really free?"
- "How does the cash back work?"
- "Am I eligible?" (Active duty vs. veteran vs. spouse)
- "What if I already have an agent?"

### Issue 8: Navigation Dropdown Hidden
**Severity: Low**

The "Contact" navigation item contains hidden dropdowns for "Get Listed Agents" and "Get Listed Lenders" - these are only visible on hover/click and may be missed.

---

## Recommendations for Implementation

### Priority 1: Add Secondary CTA for Research-Stage Users

**Location:** Hero section, next to "Find An Agent" button

**Implementation:**
```html
<!-- Add alongside existing CTA -->
<a href="/how-it-works" class="btn btn-secondary">
  See How It Works
</a>
<!-- OR -->
<a href="#bonus-calculator" class="btn btn-secondary">
  Calculate Your Bonus
</a>
```

**Rationale:** Provides a lower-commitment action for users not ready to connect with an agent.

---

### Priority 2: Create Lead Magnet & Email Capture

**Location:** Below hero section, above the map

**Suggested Content:**
- "Free PCS Checklist: Don't Miss These 15 Critical Steps"
- "VA Loan Eligibility Guide"
- "State-by-State PCS Planning Guide"

**Implementation:**
```html
<section class="lead-magnet">
  <h3>Planning Your PCS?</h3>
  <p>Download our free checklist used by 10,000+ military families</p>
  <form>
    <input type="email" placeholder="Enter your email">
    <button type="submit">Get Free Checklist</button>
  </form>
</section>
```

**Rationale:** Captures research-stage visitors for email nurturing.

---

### Priority 3: Surface State-Specific Content

**Location:** New section below hero OR sidebar/dropdown

**Implementation Option A - Popular Destinations Section:**
```html
<section class="popular-pcs-destinations">
  <h3>Popular PCS Destinations</h3>
  <div class="state-cards">
    <a href="/california">California</a>
    <a href="/texas">Texas</a>
    <a href="/florida">Florida</a>
    <a href="/georgia">Georgia</a>
    <a href="/virginia">Virginia</a>
    <a href="/north-carolina">North Carolina</a>
  </div>
  <a href="/pcs-resources">View All States →</a>
</section>
```

**Implementation Option B - Search/Dropdown:**
```html
<div class="pcs-search">
  <label>Where are you PCSing to?</label>
  <select onchange="navigateToState(this.value)">
    <option>Select a state...</option>
    <option value="/california">California</option>
    <!-- etc -->
  </select>
</div>
```

**Rationale:** Addresses the #1 user intent identified in analytics data.

---

### Priority 4: Condense Testimonials Section

**Current:** 50+ reviews in carousel
**Recommended:** 3-4 featured reviews + "Read More" link

**Implementation:**
```html
<section class="testimonials">
  <h2>What Military Families Say</h2>
  <div class="featured-reviews">
    <!-- Show 3-4 curated, impactful reviews -->
  </div>
  <a href="/stories" class="btn btn-outline">
    Read All 106 Reviews →
  </a>
</section>
```

**Selection Criteria for Featured Reviews:**
- Include at least one first-time homebuyer
- Include at least one PCS-specific story
- Include mention of bonus amount received
- Vary by branch/location if possible

---

### Priority 5: Add FAQ Section

**Location:** After "How VeteranPCS Works" section

**Suggested FAQs:**
```markdown
1. Is VeteranPCS really free to use?
   Yes, our service is 100% free for homebuyers and sellers...

2. How does the cash back bonus work?
   When you close on a home using one of our partner agents...

3. Who is eligible to use VeteranPCS?
   Active duty service members, veterans, and military spouses...

4. What if I already have a real estate agent?
   If you're already working with an agent...

5. How is VeteranPCS different from other services?
   Unlike traditional referral services...

6. What states do you cover?
   We have agents in all 50 states plus DC and Puerto Rico...
```

**Implementation:** Use accordion/collapsible component for clean UX.

---

### Priority 6: Move Bonus Calculator Higher

**Current Location:** Mid-page after photo gallery
**Recommended Location:** Second section, immediately after hero

**Rationale:** Interactive tools increase engagement and time on page. Calculator demonstrates immediate value.

---

### Priority 7: Remove Duplicate Sections

**Action:** Remove second instance of "Support our veteran community" section

**Current Structure:**
- Section appears after "We've got you covered" cards
- Same section appears again after testimonials

**Keep:** First instance only

---

### Priority 8: Add Exit-Intent Popup (Optional)

**Trigger:** User moves cursor toward browser controls

**Content:**
```html
<div class="exit-popup">
  <h3>Before you go...</h3>
  <p>Get our free PCS planning checklist</p>
  <form>
    <input type="email" placeholder="Email address">
    <button>Send My Checklist</button>
  </form>
  <button class="close">No thanks</button>
</div>
```

**Rationale:** Last opportunity to capture departing visitors.

---

## Implementation Priority Matrix

| Priority | Recommendation | Effort | Impact |
|----------|---------------|--------|--------|
| 1 | Add secondary CTA | Low | High |
| 2 | Create lead magnet + capture | Medium | High |
| 3 | Surface state-specific content | Medium | High |
| 4 | Condense testimonials | Low | Medium |
| 5 | Add FAQ section | Low | Medium |
| 6 | Move bonus calculator | Low | Medium |
| 7 | Remove duplicate sections | Low | Low |
| 8 | Exit-intent popup | Medium | Medium |

---

## Success Metrics to Track

After implementation, monitor:

1. **Homepage Exit Rate** - Target: Reduce from 72% to below 50%
2. **Email Capture Rate** - New metric, target: 3-5% of visitors
3. **"How It Works" Page Views** - Should increase with new CTA
4. **Bonus Calculator Interactions** - Track engagement
5. **Time on Homepage** - Should decrease (less scrolling needed)
6. **State Page Traffic from Homepage** - Should increase

---

## Technical Notes for Implementation

### Current Tech Stack (Observed)
- Next.js/React based (inferred from page structure)
- Responsive design
- reCAPTCHA on forms
- Social media integrations (TikTok, YouTube, Facebook, Instagram)

### Performance Considerations
- Reducing testimonials will improve page load
- Consider lazy-loading for sections below fold
- Ensure new lead capture forms don't block rendering

---

## Appendix: Current Page Screenshots Reference

Key sections that need modification:
1. Hero section - Add secondary CTA
2. Post-hero area - Add lead magnet
3. Testimonials section - Condense significantly
4. Bonus calculator - Relocate higher
5. Footer area - Newsletter already exists, enhance visibility

---
