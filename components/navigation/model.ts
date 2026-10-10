export type NavItem = {
  label: string;
  href: string;
  description?: string;
  icon?: 'home' | 'people' | 'giving' | 'chat';
  partner?: 'agent' | 'lender';
};
export type NavGroup = { title: string; icon: 'check' | 'pin' | 'home' | 'people'; items: NavItem[] };
export type NavSection = { id: string; label: string; icon: 'loan' | 'resources' | 'mission' | 'contact'; groups: NavGroup[]; promo: 'guides' | 'mission' | 'contact' };
const blog = (slug: string) => `/blog/${slug}`;
export const navigation: NavSection[] = [
  {
    id: 'va-loan', label: 'VA Loan', icon: 'loan', promo: 'guides',
    groups: [
      { title: 'Your VA loan', icon: 'home', items: [
        { label: 'VA Loan Help', href: '/va-loan-help' },
        { label: 'VA Loan Benefits', href: blog('what-are-the-benefits-of-a-va-loan') },
        { label: 'VA Loan Eligibility', href: blog('va-loan-eligibility-requirements-how-to-know-if-you-qualify-for-the-va-loan') },
        { label: 'VA Loan Guide', href: '/guides#va-loan-guide' },
      ] },
      { title: 'Take the next step', icon: 'people', items: [
        { label: 'Contact a VA Loan Expert', href: '/contact-lender', partner: 'lender' },
        { label: 'VA Loan Calculator', href: '/va-loan-calculator' },
        { label: 'Refinancing', href: '/refinancing' },
        { label: 'Find a Lender', href: '/lenders' },
      ] },
    ],
  },
  {
    id: 'pcs-resources', label: 'PCS Resources', icon: 'resources', promo: 'guides',
    groups: [
      { title: 'PCS guides & checklists', icon: 'check', items: [
        { label: 'Ultimate PCS Checklist & Timeline', href: blog('the-ultimate-pcs-checklist-and-timeline-for-active-duty-military-personnel') },
        { label: 'PCS Binder Guide', href: blog('the-ultimate-pcs-binder-guide-get-organized-for-your-move') },
        { label: 'First-Time Home Buyer Guide', href: '/guides#homebuyer-guide' },
        { label: 'VA Loan Guide', href: '/guides#va-loan-guide' },
      ] },
      { title: 'Military base locations', icon: 'pin', items: [
        { label: 'Colorado Springs', href: blog('pcs-to-fort-carson-colorado-springs-2026-guide') },
        { label: 'Military Bases in Hawaii', href: blog('what-military-bases-are-in-hawaii') },
        { label: 'Peterson & Schriever SFB', href: blog('pcs-to-peterson-schriever-sfb-colorado-springs-2026-guide') },
        { label: 'Military Bases in North Carolina', href: blog('army-bases-in-north-carolina') },
        { label: 'US Air Force Academy', href: blog('pcs-to-air-force-academy-colorado-springs-2026-guide') },
      ] },
      { title: 'Housing resources', icon: 'home', items: [
        { label: 'Using Your VA Loan', href: '/va-loan-help' },
        { label: 'VA Loan Benefits', href: blog('what-are-the-benefits-of-a-va-loan') },
        { label: 'Home Buying Process', href: blog('complete-guide-to-buying-your-first-home-with-a-va-loan') },
        { label: 'BAH Calculator', href: '/bah-calculator' },
      ] },
      { title: 'More resources', icon: 'check', items: [
        { label: 'Blog', href: '/blog' },
        { label: 'Relocation Tips', href: '/pcs-resources' },
        { label: 'Local Area Guides', href: '/blog/category/pcs-help' },
        { label: 'Trusted Resources', href: '/pcs-resources' },
      ] },
    ],
  },
  {
    id: 'mission', label: 'Mission', icon: 'mission', promo: 'mission',
    groups: [
      { title: 'Our story & impact', icon: 'home', items: [
        { label: 'Our Story', icon: 'home', href: '/about', description: 'Learn why VeteranPCS was founded and how we support military families.' },
        { label: 'Meet Our Team', icon: 'people', href: '/about', description: 'Meet the veterans and military spouses behind VeteranPCS.' },
        { label: 'Our Impact', icon: 'giving', href: '/impact', description: 'See how your move gives back to military families.' },
        { label: 'Success Stories', icon: 'chat', href: '/stories', description: 'Read real experiences from military families.' },
        { label: 'How It Works', icon: 'home', href: '/how-it-works' },
      ] },
      { title: 'Get involved', icon: 'people', items: [
        { label: 'Careers & Internships', href: '/internship', description: 'Build skills and prepare for your next chapter.' },
        { label: 'Agents Get Listed', href: '/get-listed-agents', description: 'Join our nationwide network of real estate agents.' },
        { label: 'Lenders Get Listed', href: '/get-listed-lenders', description: 'Join our network of VA loan experts.' },
      ] },
    ],
  },
  {
    id: 'contact', label: 'Contact', icon: 'contact', promo: 'contact',
    groups: [
      { title: 'Get in touch', icon: 'check', items: [
        { label: 'Contact Us', href: '/contact' },
        { label: 'Send a Message', href: '/contact' },
        { label: 'FAQ & Support', href: '/how-it-works' },
        { label: 'Media & Partnerships', href: '/contact' },
      ] },
      { title: 'Connect', icon: 'people', items: [
        { label: 'Match With an Agent', href: '/contact-agent', partner: 'agent' },
        { label: 'Contact a VA Loan Expert', href: '/contact-lender', partner: 'lender' },
        { label: 'Become an Agent', href: '/get-listed-agents' },
        { label: 'Become a Lender', href: '/get-listed-lenders' },
      ] },
    ],
  },
];
