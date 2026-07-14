import { getHowItWorksSection, MOVE_IN_BONUS } from '@/lib/content/how-it-works';

export interface HowItWorksContentProps {
    _id: string;
    _updatedAt: string;
    _createdAt: string;
    _type: string;
    component_header: Block[];
    description: Block[];
    header_slug: Slug;
}

export interface Block {
    _type: string;
    style: string;
    _key: string;
    markDefs: MarkDef[];
    children: Child[];
    listItem?: string; // Optional because not all blocks have list items
    level?: number; // Optional because not all blocks have levels
}

export interface Child {
    _key: string;
    _type: string;
    marks: string[];
    text: string;
}

export interface MarkDef {
    _key: string;
    _type: string;
}

export interface Slug {
    current: string;
    _type: string;
}

export interface HowBonusMoveInContentProps {
    _id: string;
    _updatedAt: string;
    _createdAt: string;
    _type: string;
    requirements: Block[];
    description: Block[];
    title: string;
    bonusTable: Table[];
}

interface Table {
    moveInBonus: string;
    _key: string;
    priceRange: string;
    charityDonation: string;
}

const howItWorksService = {
    fetchOverviewSection: async (component: string): Promise<HowItWorksContentProps> => {
        const section = getHowItWorksSection(component);
        if (!section) {
            throw new Error(`How It Works section not found: ${component}`);
        }
        return section;
    },
    fetchMoveInBonus: async (): Promise<HowBonusMoveInContentProps> => {
        return MOVE_IN_BONUS;
    },
};

export default howItWorksService;
