# Steph asset retrieval — 2026-10-09

## Actual retrieval

`branding-guide.pdf` was downloaded unchanged using the authenticated Google Drive connector file reference. 689,157 bytes. Source: [Veteran PCS branding guide.pdf](https://drive.google.com/file/d/1Ag_k2cyLH6PJ6uX7v-k_hW6ObzZDv2QD/view), parent branding folder `1-bddKKSqll2a_0jKAFv7c1sFjsS3nk_C`. Illustrator-created PDF dated July 9, 2024. The guide specifies Tahoma Regular and Bold; navy #292F6C and red #A81F23. Its font objects are subset-embedded Tahoma Bold, Tahoma, Avenir Medium and MyriadPro Regular. These PDF subsets are not deployable complete web fonts. No standalone font binaries or web-use license were found in the folder or accessible Drive searches.

## Requested clean hero exports: absent from examined sources

The user-provided [website updates folder](https://drive.google.com/drive/folders/1Zpig6wtALjXkiFPS86Yo9bfhZ_4K9JCj) contains seven direct subfolders. `steph editing files` was excluded entirely. Resources, VA Loan, homepage, blog and menus direct folder inventories each contain only the corresponding reference PDF. No clean PNG/JPG/WebP original or source-design link is present in the Resources or VA Loan folders, and file metadata supplies no design-source description/link.

- Resources: [vpcs- webpage-update-resourses.pdf](https://drive.google.com/file/d/1OwWxAn55YrD-4WVkM3QvTkseZMoeu2nQ/view). Matching local Downloads PDF inspected with bundled Poppler. Exactly one page image object, RGB 864×1821 at 72ppi; zero separate hero layers, zero fonts, zero URL annotations. The rear-view military family/house/flag is already composited with text, input and navigation.
- VA Loan: [vpcs- webpage-update-va-loan.pdf](https://drive.google.com/file/d/1CwXRIQV_1yswVpJc5uzQ5XVXyPVvJDZu/view). Matching local Downloads PDF inspected with bundled Poppler. Exactly one page image object, RGB 892×1764 at 75ppi; zero separate hero layers, zero fonts, zero URL annotations. The keys/couple/house image is permanently obscured by the calculator overlay in the flattened artwork.

No hero screenshot was promoted to a deployable clean asset. Repository inventory inspection covered all large PNG/JPG/WebP files in `public/assets` and all 701 non-agent/non-lender content candidates (including duplicate state maps, diagrams and redesigned existing assets). Viewed contact sheets show no exact full original matching either requested hero. Similar family imagery is different and cannot establish fidelity. Contact-sheet JPGs and text indexes here are retrieval evidence, not product assets.

Drive metadata/image searches for hero/resources/family/VA loan/keys and explicit font extensions (`woff`, `ttf`, `otf`) and names Tahoma/Myriad/fonts/license did not locate the missing matching image originals or deployable fonts. Branding folder has logos, the guide PDF and guide AI; no fonts or hero images. Excluded editing folder was never opened.

## Font deployment source information

- Microsoft [Tahoma family](https://learn.microsoft.com/en-us/typography/font-list/tahoma) points to separate licensing for enterprises/web developers/redistribution. No such licensed web bundle was found in the user's sources.
- Adobe [web font licensing](https://helpx.adobe.com/fonts/web/font-licensing/webfont-licensing.html) describes using a client's own Creative Cloud web font project and says Adobe Fonts files cannot be self-hosted under those terms. No client Adobe web-project CSS/kit URL was found in the searched sources.

These findings identify missing source artifacts; they do not authorize substituting another photo/font or copying installed desktop fonts. No random fonts were installed, external messages sent, source files edited or sharing settings changed.

## Recovered clean native photo regions

The asset agent recovered the Resources family/house/flag photograph at 424×258px from native bitmap bounds [440,94,864,352). It contains no screenshot text or controls. The VA upper photo at 462×223px comes from [430,110,892,333); both faces, house, flag, and upper raised hand are visible. The full lower hand/keys/body composition remains obscured by the flattened calculator card. No missing pixels were invented. Both crop checksums and source IDs are recorded in sources.json.

The clean Resources region replaces the temporary flag-only draft. The clean VA region improves the draft but does not close its full-composition acceptance dependency. Full-resolution imagery and licensed deployable fonts have not been located. The excluded editing folder remains uninspected pending explicit scope clarification.

Final VA hero correction: use `va-hero-photo-region.png`, bounds [430,114,892,333), 462×219px. The extra four top rows were the flattened divider; the new filename also avoids stale optimized image cache. Eight exact clean resource-card photo strips (four per page) are now recorded in sources.json. The Resources hero crop omits part of the child at its left edge; the native strips also retain the PDF's resolution limits.
