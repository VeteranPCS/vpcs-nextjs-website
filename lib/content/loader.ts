// Shared validation helpers for the repo-committed content under
// content/_data/site/*.json (the Sanity repo-migration export).
//
// Pattern (mirrors lib/blog/components.ts): each content type module imports
// its JSON, validates it at module load with functions that THROW on a bad
// shape so the build fails on bad data, and exports the validated constants.
// These helpers are deliberately generic so later migration sections
// (how-it-works, impact, stories, homepage, state_list, ...) can reuse them.

export type ContentImage = {
  /** Original Sanity asset id, kept for traceability against the manifest. */
  _sanityAssetId?: string;
  alt: string;
  /** Local public/ path, e.g. /images/content/member-info/harper-new.webp */
  path: string;
  width: number;
  height: number;
};

export type PortableTextSpan = {
  _key: string;
  _type: string;
  marks: string[];
  text: string;
};

export type PortableTextMarkDef = {
  _key: string;
  _type: string;
  href?: string;
};

export type PortableTextBlock = {
  _key: string;
  _type: string;
  style: string;
  children: PortableTextSpan[];
  markDefs: PortableTextMarkDef[];
  listItem?: string;
  level?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(fileLabel: string, message: string): never {
  throw new Error(`${fileLabel}: ${message}`);
}

/**
 * Validates the top-level export file shape: an array of documents that all
 * carry the expected `_type` and a non-empty `_id`.
 */
export function requireDocArray(
  fileLabel: string,
  raw: unknown,
  expectedType: string,
): Record<string, unknown>[] {
  if (!Array.isArray(raw)) {
    fail(fileLabel, `must be an array of ${expectedType} documents`);
  }
  return raw.map((doc, index) => {
    if (!isRecord(doc)) {
      fail(fileLabel, `document at index ${index} must be an object`);
    }
    if (doc._type !== expectedType) {
      fail(fileLabel, `document at index ${index} has _type ${JSON.stringify(doc._type)}, expected "${expectedType}"`);
    }
    if (typeof doc._id !== 'string' || doc._id.length === 0) {
      fail(fileLabel, `document at index ${index} is missing a string _id`);
    }
    return doc;
  });
}

export function requireString(
  fileLabel: string,
  doc: Record<string, unknown>,
  field: string,
): string {
  const value = doc[field];
  if (typeof value !== 'string' || value.length === 0) {
    fail(fileLabel, `document ${JSON.stringify(doc._id)} is missing string field "${field}"`);
  }
  return value;
}

function validateImage(
  fileLabel: string,
  doc: Record<string, unknown>,
  field: string,
  value: unknown,
): ContentImage {
  if (
    !isRecord(value) ||
    typeof value.alt !== 'string' ||
    typeof value.path !== 'string' ||
    !value.path.startsWith('/images/') ||
    typeof value.width !== 'number' ||
    typeof value.height !== 'number'
  ) {
    fail(fileLabel, `document ${JSON.stringify(doc._id)} has an invalid image field "${field}" (expected { alt, path: "/images/...", width, height })`);
  }
  return {
    _sanityAssetId: typeof value._sanityAssetId === 'string' ? value._sanityAssetId : undefined,
    alt: value.alt,
    path: value.path,
    width: value.width,
    height: value.height,
  };
}

export function requireImage(
  fileLabel: string,
  doc: Record<string, unknown>,
  field: string,
): ContentImage {
  const value = doc[field];
  if (value === undefined) {
    fail(fileLabel, `document ${JSON.stringify(doc._id)} is missing image field "${field}"`);
  }
  return validateImage(fileLabel, doc, field, value);
}

export function optionalImage(
  fileLabel: string,
  doc: Record<string, unknown>,
  field: string,
): ContentImage | undefined {
  const value = doc[field];
  if (value === undefined) return undefined;
  return validateImage(fileLabel, doc, field, value);
}

/**
 * Validates a Portable Text `block[]` field kept as JSON (or, for the
 * hand-transcribed rich-text modules, used by their parity tests).
 */
export function requirePortableText(
  fileLabel: string,
  doc: Record<string, unknown>,
  field: string,
): PortableTextBlock[] {
  const value = doc[field];
  if (!Array.isArray(value) || value.length === 0) {
    fail(fileLabel, `document ${JSON.stringify(doc._id)} is missing Portable Text field "${field}"`);
  }
  return value.map((block, index) => {
    if (
      !isRecord(block) ||
      typeof block._key !== 'string' ||
      typeof block._type !== 'string' ||
      typeof block.style !== 'string' ||
      !Array.isArray(block.children) ||
      !Array.isArray(block.markDefs)
    ) {
      fail(fileLabel, `document ${JSON.stringify(doc._id)} has an invalid Portable Text block at "${field}"[${index}]`);
    }
    const children = block.children.map((child, childIndex): PortableTextSpan => {
      if (
        !isRecord(child) ||
        typeof child._key !== 'string' ||
        typeof child._type !== 'string' ||
        typeof child.text !== 'string' ||
        !Array.isArray(child.marks) ||
        !child.marks.every((mark) => typeof mark === 'string')
      ) {
        fail(fileLabel, `document ${JSON.stringify(doc._id)} has an invalid span at "${field}"[${index}].children[${childIndex}]`);
      }
      return { _key: child._key, _type: child._type, marks: child.marks, text: child.text };
    });
    const markDefs = block.markDefs.map((markDef, markIndex): PortableTextMarkDef => {
      if (!isRecord(markDef) || typeof markDef._key !== 'string' || typeof markDef._type !== 'string') {
        fail(fileLabel, `document ${JSON.stringify(doc._id)} has an invalid markDef at "${field}"[${index}].markDefs[${markIndex}]`);
      }
      return {
        _key: markDef._key,
        _type: markDef._type,
        href: typeof markDef.href === 'string' ? markDef.href : undefined,
      };
    });
    return {
      _key: block._key,
      _type: block._type,
      style: block.style,
      children,
      markDefs,
      listItem: typeof block.listItem === 'string' ? block.listItem : undefined,
      level: typeof block.level === 'number' ? block.level : undefined,
    };
  });
}
