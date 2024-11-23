This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

It uses TailwindCSS for styling and [Sanity.io](https://www.sanity.io/docs) as its CMS.

The project is deployed on [Vercel](https://vercel.com).

Additional functionality includes:

- Salesforce API integrations
    - Dynamically render VeteranPCS agents on their respective state pages based on Salesforce data.
    - Dynamically render VeteranPCS lenders on their respective state pages based on Salesforce data.
    - Connect customers to agents using Salesforce web-to-lead forms.
    - Connect customers to lenders using Salesforce web-to-lead forms.
    - Connect agents interested in being listed on the website to VeteranPCS using Salesforce web-to-lead forms.
    - Connect lenders interested in being listed on the website to VeteranPCS using Salesforce web-to-lead forms.

### Other Features Required

- Integrate Google Analytics using `@next/third-parties` library.
    - Use cases for both `<GoogleTagManager />` and `<GoogleAnalytics />` components.
- Integrate [Microsoft Clarity](https://clarity.microsoft.com) to view user actions on the site.

## Getting Started

Clone repository:

```bash
gh repo clone VeteranPCS/vpcs-nextjs-website
```

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

## Documentation

### Next.js

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) for various use cases and examples.

### Sanity.io CMS

- [Sanity.io](https://www.sanity.io/docs)

### Next Third Parties Library

- [Third Parties Library Docs](https://nextjs.org/docs/app/building-your-application/optimizing/third-party-libraries)

## Design

- [Figma Designs](https://www.figma.com/design/eBD9WDWKoV4n0tyQCyIcEu/VeteranPCS-Homepage?node-id=1-2&node-type=frame&t=TExBGR1f1hLMB33F-0)