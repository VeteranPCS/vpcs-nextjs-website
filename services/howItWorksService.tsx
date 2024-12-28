import { client } from '@/sanity/lib/client';
import { SanityDocument } from '@sanity/client';

export interface HowItWorksContentProps {
    _id: string;
    _updatedAt: string;
    _createdAt: string;
    _rev: string;
    _type: string;
    component_header: Block[];
    description: Block[];
    header_slug: Slug;
}

interface AccountDocument extends SanityDocument {
    _type: 'howVeterencePCSServiceWorks';
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
    _rev: string;
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
    fetchHowVeterencePCSWorks: async (): Promise<AccountDocument> => {
        try {
            const story = await client.fetch<AccountDocument>(`*[_type == "howVeterencePCSServiceWorks"][0]`);


            if (story) {
                return story;
            } else {
                throw new Error('Failed to fetch How Veterence PCS Works Data');
            }
        } catch (error: any) {
            console.error('Error fetching How Veterence PCS Works Data:', error);
            throw error;
        }
    },
    fetchOverviewSection: async (component: string): Promise<HowItWorksContentProps> => {
        try {

            const story = await client.fetch<HowItWorksContentProps>(`*[_type == "how_veterence_pcs_works" && header_slug.current == $component][0]`, { component });

            if (story) {
                return story as HowItWorksContentProps;
            } else {
                throw new Error('Failed to Fetch How It Works Overview Section');
            }
        } catch (error: any) {
            console.error('Error fetching How It Works Overview Section:', error);
            throw error;
        }
    },
    fetchMoveInBonus: async (): Promise<HowBonusMoveInContentProps> => {
        try {
            const story = await client.fetch<HowBonusMoveInContentProps>(`*[_type == "moveInBonus"][0]`);


            if (story) {
                return story as HowBonusMoveInContentProps;
            } else {
                throw new Error('Failed to Fetch How Move In Bonus Works Content');
            }
        } catch (error: any) {
            console.error('Error fetching How Move In Bonus Works Content:', error);
            throw error;
        }
    },
};

export default howItWorksService;
