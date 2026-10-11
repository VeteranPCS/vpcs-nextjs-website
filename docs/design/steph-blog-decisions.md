# Steph article implementation decisions

Source: `vpcs- webpage-update-blog.pdf` and `/private/tmp/steph-blog-1.png`.

- Existing article titles, body, author resolution, subject state, metadata, canonical URL, JSON-LD, heading IDs and embedded partner attribution remain the source of truth. Placeholder source text is not published.
- Article images come from each post's existing mainImage. Bonus family and guide covers are exact source extractions supplied by the coordinator. No generated or screenshot-as-section assets.
- Helpful resources use actual existing checklist, BAH, base category and VA guide destinations. Guide capture accurately says First-Time Homebuyer Guide and asks required details in the shared dialog.
- Testimonials use the committed Google review records for Breanna Walker and Hailey Jensen, with names and original quotes; initials avoid implying an unrelated photograph is the reviewer. No invented rating or review count.
- MDX is parsed with the existing @mdx-js/mdx dependency and GFM plugin. Promotion insertion happens only between complete top-level nodes and retains every source byte. Documents with imports/exports/reference definitions, unparseable input, or fewer than 800 characters remain intact, with promotions after the body.
- Desktop sidebar follows the source TOC/newsletter/social/resources/bonus arrangement. Below 1200px TOC is collapsible before the body and sidebar promotions follow the article. The contextual contact CTA remains fixed at the bottom, with explicit article padding and safe-area clearance.
