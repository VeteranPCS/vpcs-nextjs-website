# Blog MDX Components

Custom React components that can be dropped into any `content/blog/*.mdx` file.

## How they work

`mdx-components.tsx` (at the repo root) imports everything from this folder's
`index.ts` and exposes the components by their PascalCase names to MDX. That
means **any `.mdx` body** can use them inline without per-post imports:

```mdx
Some intro paragraph.

<Callout type="info" title="Heads up">
  This is **markdown** inside a custom component.
</Callout>

<PromoCard
  headline="Spring PCS Bonus"
  cta="Claim Yours"
  href="/seasonal-promo" />

<AgentCTA salesforceId="0014x00000ABCdEFGH" />

More normal markdown after.
```

## Adding a new component

1. Create a new `.tsx` file in this folder. **Default to a server component** —
   no `"use client"` unless the component genuinely needs interactivity.
2. Add a re-export to `index.ts`.
3. It's now usable in any `.mdx` file as `<ComponentName ... />`.

## Component conventions

- **Server-first.** The blog stack is fully RSC. Add `"use client"` only on
  leaves that need handlers, state, or browser APIs.
- **Self-contained styling.** Use Tailwind classes inline; don't depend on
  page-level CSS that may not exist on every blog page.
- **Time-limited content** is fine — accept an `expiresAt` prop and return
  `null` after that timestamp. The blog index uses `revalidate: 86400` so the
  content disappears within 24h without a deploy.
- **No raw secrets** in props. Salesforce lookups happen inside server
  components like `<AgentCTA />` that reuse `resolveAuthor()` server-side.
