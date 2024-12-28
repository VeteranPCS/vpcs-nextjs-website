import { client } from '@/sanity/lib/client'
import { urlForImage } from '@/sanity/lib/image';

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
            const employmentData = await client.fetch<EmploymentDataProps[]>(`*[_type == "military_spouse_employment"]`)

            employmentData.map((employment) => {
                if (employment?.logo?.asset?._ref) {
                    employment.logo.asset.image_url = urlForImage(employment.logo.asset);
                }
            })

            if (employmentData) {
                return employmentData as EmploymentDataProps[];
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
            const movingYourLife = await client.fetch<MovingYourLifeProps[]>(`*[_type == "moving_your_life"]`)

            movingYourLife.map((data) => {
                if (data?.logo?.asset?._ref) {
                    data.logo.asset.image_url = urlForImage(data.logo.asset);
                }
            })

            if (movingYourLife) {
                return movingYourLife as MovingYourLifeProps[];
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
            const militarySpouseApproved = await client.fetch<MilitarySpouseApprovedProps>(`*[_type == "military_spouse_approved"][0]`)

            if (militarySpouseApproved?.image?.asset?._ref) {
                militarySpouseApproved.image.asset.image_url = urlForImage(militarySpouseApproved.image.asset);
            }

            if (militarySpouseApproved) {
                return militarySpouseApproved as MilitarySpouseApprovedProps;
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
            const militarySpouseApprovedCompanies = await client.fetch<MilitarySpouseApprovedCompaniesProps[]>(`*[_type == "approved_company_list"]`)

            militarySpouseApprovedCompanies.map((data) => {
                if (data?.image?.asset?._ref) {
                    data.image.asset.image_url = urlForImage(data.image.asset);
                }
            })

            if (militarySpouseApprovedCompanies) {
                return militarySpouseApprovedCompanies as MilitarySpouseApprovedCompaniesProps[];
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
