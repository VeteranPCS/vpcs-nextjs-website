import type { ReactNode } from 'react';

// Classes match the rendering these blocks previously got from the inline
// Portable Text renderer (components/homepage/FamilySupport/SupportContent's
// "normal" style) so the sections look identical.
const supportParagraph = 'mb-6 leading-relaxed';
const supportStrong = 'font-bold';

export type SupportVeterenceContent = {
  /** The blurb under the section title. */
  description: ReactNode;
  /** One node per point; consumers wrap each in its own check-icon row. */
  points: ReactNode[];
};

/**
 * Support-section copy hand-transcribed from the Sanity `support_veterence`
 * Portable Text export (content/_data/site/support_veterence.json), keyed by
 * document `_id`. Scalar fields (title, button_text, images) still come from
 * services/veterenceSupportService; only the rich description/points copy
 * lives here so emphasis and paragraphs stay freely editable JSX.
 *
 * The export's fourth document ("support-veterans-and-their-families",
 * _id 1a48f335-e0b6-4ddb-b635-82efd16f82e3) is referenced by no page, so it
 * is deliberately not transcribed.
 *
 * Editing copy? lib/content/__tests__/support-veterence-parity.test.tsx
 * compares this module's rendered output against the exported JSON; update or
 * retire that check deliberately if the copy is meant to diverge.
 */
export const SUPPORT_VETERENCE_CONTENT: Record<string, SupportVeterenceContent> = {
  // support-our-veteran-community (homepage, /va-loan-help, /pcs-resources, /stories)
  '20519935-de47-41c1-941a-764245b59499': {
    description: (
      <p className={supportParagraph}>Support military spouse & veteran owned businesses</p>
    ),
    points: [
      <p className={supportParagraph} key="free">
        VeteranPCS is <strong className={supportStrong}>FREE</strong> to use.
      </p>,
      <p className={supportParagraph} key="charities">
        Each closing gives <strong className={supportStrong}>10% to military focused charities</strong>.
      </p>,
      <p className={supportParagraph} key="commission">
        Part of your agent&apos;s commission goes back to you at closing.
      </p>,
    ],
  },
  // support-our-veteran-community-spanish (/spanish)
  '237b03fd-3a89-4be6-bd05-445cb8a22760': {
    description: (
      <p className={supportParagraph}>
        Apoya a los negocios propiedad de cónyuges de militares y veteranos
      </p>
    ),
    points: [
      <p className={supportParagraph} key="dona">
        Cada cierre de vivienda dona el 10% a las organizaciones benéficas enfocadas en militares.
      </p>,
      <p className={supportParagraph} key="gratis-agentes">
        Es GRATIS para los agentes estar listados.
      </p>,
      <p className={supportParagraph} key="gratis-usar">
        VeteranPCS es GRATIS para usar. Parte de la comisión de tu agente regresa a ti en el
        cierre de vivienda.
      </p>,
    ],
  },
  // freedom-service-dogs (/impact)
  '85050721-337d-4202-b31b-a262d4654ca7': {
    description: (
      <p className={supportParagraph}>
        By just using our site you help us support important missions like Freedom Service Dogs
        of America
      </p>
    ),
    points: [
      <p className={supportParagraph} key="free">
        VeteranPCS is <strong className={supportStrong}>FREE</strong> to use.
      </p>,
      <p className={supportParagraph} key="charities">
        Each closing gives <strong className={supportStrong}>10% to military focused charities</strong>.
      </p>,
      <p className={supportParagraph} key="commission">
        Part of your agent&apos;s commission goes back to you at closing.
      </p>,
    ],
  },
};
