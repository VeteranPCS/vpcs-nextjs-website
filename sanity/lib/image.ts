import createImageUrlBuilder from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'

import { dataset, projectId } from '@/sanity/env'

const imageBuilder = createImageUrlBuilder({
  projectId: projectId || '',
  dataset: dataset || '',
})

// SanityImageSource is exactly what imageBuilder.image() accepts: an asset reference, an
// asset object, or a full image object with crop/hotspot. Typing the param as the Studio
// `Image` was too strict — it rejected the generated GROQ projection objects, which forced
// callers to pass a bare asset and silently dropped editor-configured crop/hotspot.
export const urlForImage = (source: SanityImageSource) => {
  return imageBuilder?.image(source).auto('format').fit('max').url()
}
