import { API_ENDPOINTS } from '@/constants/api'
import { api, RequestType } from '@/services/api';

interface EmploymentLogo {
    asset: {
        _ref?: string;
        image_url?: string;
    };
    _type: string;
    alt: string;
}

export interface EmploymentDataProps {
    _id: string;
    _type: string;
    name: string;
    description: string;
    logo: EmploymentLogo;
    _updatedAt: string;
    _createdAt: string;
    _rev: string;
    url: string;
}

export interface MovingYourLifeProps {
    _id: string;
    _type: string;
    name: string;
    description: string;
    logo: EmploymentLogo;
    _updatedAt: string;
    _createdAt: string;
    _rev: string;
    url: string;
}

export interface MilitarySpouseApprovedProps {
    _id: string;
    _type: string;
    component_title: string;
    header: string;
    description: DescriptionBlock[];
    image: EmploymentLogo;
    _updatedAt: string;
    _createdAt: string;
    _rev: string;
}

interface DescriptionBlock {
    _type: string;
    style: string;
    _key: string;
    listItem?: string; // Indicates it's a list item
    markDefs: any[];
    children: {
        _key: string;
        _type: string;
        marks: string[];
        text: string;
    }[];
    level?: number; // List level
}

export interface MilitarySpouseApprovedCompaniesProps {
    _id: string;
    _type: string;
    name: string;
    image: EmploymentLogo;
    _updatedAt: string;
    _createdAt: string;
    _rev: string;
}

const militarySpouseService = {
    fetchMilitarySpouseEmployment: async (): Promise<EmploymentDataProps[]> => {
        try {
            const response = await api({
                endpoint: API_ENDPOINTS.fetchMilitarySpouseEmployment,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data as EmploymentDataProps[];
            } else {
                throw new Error('Failed to fetch Military Spouse Employment');
            }
        } catch (error: any) {
            console.error('Error fetching Military Spouse Employment:', error);
            throw error; // You can handle the error more gracefully based on your needs
        }
    },
    fetchMovingYourLife: async (): Promise<MovingYourLifeProps[]> => {
        try {
            const response = await api({
                endpoint: API_ENDPOINTS.fetchMovingYourLife,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data as MovingYourLifeProps[];
            } else {
                throw new Error('Failed to fetch Moving Your Life');
            }
        } catch (error: any) {
            console.error('Error fetching Moving Your Life:', error);
            throw error; // You can handle the error more gracefully based on your needs
        }
    },
    fetchMilitarySpouseApproved: async (): Promise<MilitarySpouseApprovedProps> => {
        try {
            const response = await api({
                endpoint: API_ENDPOINTS.fetchMilitarySpouseApproved,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data as MilitarySpouseApprovedProps;
            } else {
                throw new Error('Failed to fetch Military Spouse Approved');
            }
        } catch (error: any) {
            console.error('Error fetching Military Spouse Approved:', error);
            throw error; // You can handle the error more gracefully based on your needs
        }
    },
    fetchMilitarySpouseApprovedCompanies: async (): Promise<MilitarySpouseApprovedCompaniesProps[]> => {
        try {
            const response = await api({
                endpoint: API_ENDPOINTS.fetchMilitarySpouseApprovedCompanies,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data as MilitarySpouseApprovedCompaniesProps[];
            } else {
                throw new Error('Failed to fetch Military Spouse Approved');
            }
        } catch (error: any) {
            console.error('Error fetching Military Spouse Approved:', error);
            throw error; // You can handle the error more gracefully based on your needs
        }
    },
};

export default militarySpouseService;
