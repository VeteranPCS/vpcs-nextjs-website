import type { ReactNode } from 'react';

type Variant = 'info' | 'warning' | 'success' | 'note';

const VARIANT_STYLES: Record<Variant, string> = {
  info: 'border-[#1F6FB2] bg-[#E8F1FA] text-[#0F3D6B]',
  warning: 'border-[#C28A1B] bg-[#FCF4E1] text-[#7A5306]',
  success: 'border-[#2F7A3A] bg-[#E7F4E9] text-[#1F4F25]',
  note: 'border-[#6B7280] bg-[#F3F4F6] text-[#1F2937]',
};

type Props = {
  type?: Variant;
  title?: string;
  children: ReactNode;
};

export default function Callout({ type = 'info', title, children }: Props) {
  return (
    <aside
      className={`my-6 rounded-xl border-l-4 px-5 py-4 ${VARIANT_STYLES[type]}`}
      role="note"
    >
      {title ? <p className="font-bold tahoma mb-2">{title}</p> : null}
      <div className="roboto text-sm leading-6 [&>p]:m-0 [&>p+p]:mt-3">{children}</div>
    </aside>
  );
}
