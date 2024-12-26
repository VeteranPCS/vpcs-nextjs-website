import { API_ENDPOINTS } from '@/constants/api'
import { api, RequestType } from '@/services/api';

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
    fetchHowVeterencePCSWorks: async (): Promise<Response> => {
        try {
            const response = await api({
                endpoint: API_ENDPOINTS.howVeterencePCSServiceWorks,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data;
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

            const response = await api({
                endpoint: `${API_ENDPOINTS.fetchHowItWorksOverview}?component=${component}`,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data as HowItWorksContentProps;
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
            const response = await api({
                endpoint: API_ENDPOINTS.fetchMoveInBonus,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data as HowBonusMoveInContentProps;
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
