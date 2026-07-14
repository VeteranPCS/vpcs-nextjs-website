import 'server-only';

// Typed loaders for the About section's repo-committed content
// (content/_data/site/aboutUsPage.json, aboutSupportComponent.json,
// member_info.json), replacing the Sanity fetches in services/aboutService.
// Validation runs at module load and throws, so a bad export fails the build
// instead of silently rendering a broken page (pattern: lib/blog/components.ts).

import aboutUsPageJson from '@/content/_data/site/aboutUsPage.json';
import aboutSupportComponentJson from '@/content/_data/site/aboutSupportComponent.json';
import memberInfoJson from '@/content/_data/site/member_info.json';
import {
  optionalImage,
  requireDocArray,
  requireImage,
  requirePortableText,
  requireString,
  type ContentImage,
  type PortableTextBlock,
} from '@/lib/content/loader';

export type AboutUsPageDoc = {
  _id: string;
  componentName: string;
  header: string;
  description: string;
  buttonText: string;
  background_image?: ContentImage;
  foreground_image?: ContentImage;
};

export type AboutSupportComponentDoc = {
  _id: string;
  header_1: string;
  header_2: string;
  description_1: string;
  description_2: string;
  buttonText_1: string;
  buttonText_2: string;
  image: ContentImage;
};

export type MemberInfoDoc = {
  _id: string;
  name: string;
  designation: string;
  roles: string;
  image: ContentImage;
  /** Portable Text export of the bio; rendered copy lives in components/About/teamBios.tsx. */
  description: PortableTextBlock[];
};

// componentNames the About/Spanish pages fetch; all three must exist.
const REQUIRED_ABOUT_COMPONENTS = ['overview', 'move_with_a_mission', 'how_veternce_pcs_started'] as const;

function validateAboutUsPages(raw: unknown): readonly AboutUsPageDoc[] {
  const file = 'aboutUsPage.json';
  const pages = requireDocArray(file, raw, 'aboutUsPage').map((doc): AboutUsPageDoc => ({
    _id: requireString(file, doc, '_id'),
    componentName: requireString(file, doc, 'componentName'),
    header: requireString(file, doc, 'header'),
    description: requireString(file, doc, 'description'),
    buttonText: requireString(file, doc, 'buttonText'),
    background_image: optionalImage(file, doc, 'background_image'),
    foreground_image: optionalImage(file, doc, 'foreground_image'),
  }));
  for (const componentName of REQUIRED_ABOUT_COMPONENTS) {
    if (!pages.some((page) => page.componentName === componentName)) {
      throw new Error(`${file}: missing required componentName "${componentName}"`);
    }
  }
  return pages;
}

function validateAboutSupportComponent(raw: unknown): AboutSupportComponentDoc {
  const file = 'aboutSupportComponent.json';
  const docs = requireDocArray(file, raw, 'aboutSupportComponent');
  const doc = docs[0];
  if (!doc) {
    throw new Error(`${file}: expected at least one aboutSupportComponent document`);
  }
  return {
    _id: requireString(file, doc, '_id'),
    header_1: requireString(file, doc, 'header_1'),
    header_2: requireString(file, doc, 'header_2'),
    description_1: requireString(file, doc, 'description_1'),
    description_2: requireString(file, doc, 'description_2'),
    buttonText_1: requireString(file, doc, 'buttonText_1'),
    buttonText_2: requireString(file, doc, 'buttonText_2'),
    image: requireImage(file, doc, 'image'),
  };
}

function validateMemberInfo(raw: unknown): readonly MemberInfoDoc[] {
  const file = 'member_info.json';
  return requireDocArray(file, raw, 'member_info').map((doc): MemberInfoDoc => ({
    _id: requireString(file, doc, '_id'),
    name: requireString(file, doc, 'name'),
    designation: requireString(file, doc, 'designation'),
    roles: requireString(file, doc, 'roles'),
    image: requireImage(file, doc, 'image'),
    description: requirePortableText(file, doc, 'description'),
  }));
}

export const ABOUT_US_PAGES = validateAboutUsPages(aboutUsPageJson);

const ABOUT_US_PAGE_BY_COMPONENT: ReadonlyMap<string, AboutUsPageDoc> = new Map(
  ABOUT_US_PAGES.map((page) => [page.componentName, page]),
);

export function getAboutUsPage(componentName: string): AboutUsPageDoc | null {
  return ABOUT_US_PAGE_BY_COMPONENT.get(componentName) ?? null;
}

export const ABOUT_SUPPORT_COMPONENT = validateAboutSupportComponent(aboutSupportComponentJson);

export const MEMBER_INFO = validateMemberInfo(memberInfoJson);

export function getMembersByRole(roles: string): MemberInfoDoc[] {
  return MEMBER_INFO.filter((member) => member.roles === roles);
}

// Only import __testables from tests.
export const __testables = { validateAboutUsPages, validateAboutSupportComponent, validateMemberInfo };
