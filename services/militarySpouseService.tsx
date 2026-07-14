import {
    APPROVED_COMPANIES,
    MILITARY_SPOUSE_APPROVED,
    MILITARY_SPOUSE_EMPLOYMENT,
    MOVING_YOUR_LIFE,
} from '@/lib/content/military-spouse';
import { toLegacyImage } from '@/lib/content/loader';

interface EmploymentLogo {
    asset: {
        image_url: string;
    };
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
}

const militarySpouseService = {
    fetchMilitarySpouseEmployment: async (): Promise<EmploymentDataProps[]> => {
        return MILITARY_SPOUSE_EMPLOYMENT.map((doc) => ({
            _id: doc._id,
            _type: doc._type,
            name: doc.name,
            description: doc.description,
            logo: toLegacyImage(doc.logo),
            _updatedAt: doc._updatedAt,
            _createdAt: doc._createdAt,
            url: doc.url,
        }));
    },
    fetchMovingYourLife: async (): Promise<MovingYourLifeProps[]> => {
        return MOVING_YOUR_LIFE.map((doc) => ({
            _id: doc._id,
            _type: doc._type,
            name: doc.name,
            description: doc.description,
            logo: toLegacyImage(doc.logo),
            _updatedAt: doc._updatedAt,
            _createdAt: doc._createdAt,
            url: doc.url,
        }));
    },
    fetchMilitarySpouseApproved: async (): Promise<MilitarySpouseApprovedProps> => {
        return {
            _id: MILITARY_SPOUSE_APPROVED._id,
            _type: MILITARY_SPOUSE_APPROVED._type,
            component_title: MILITARY_SPOUSE_APPROVED.component_title,
            header: MILITARY_SPOUSE_APPROVED.header,
            description: MILITARY_SPOUSE_APPROVED.description,
            image: toLegacyImage(MILITARY_SPOUSE_APPROVED.image),
            _updatedAt: MILITARY_SPOUSE_APPROVED._updatedAt,
            _createdAt: MILITARY_SPOUSE_APPROVED._createdAt,
        };
    },
    fetchMilitarySpouseApprovedCompanies: async (): Promise<MilitarySpouseApprovedCompaniesProps[]> => {
        return APPROVED_COMPANIES.map((doc) => ({
            _id: doc._id,
            _type: doc._type,
            name: doc.name,
            image: toLegacyImage(doc.image),
            _updatedAt: doc._updatedAt,
            _createdAt: doc._createdAt,
        }));
    },
};

export default militarySpouseService;
