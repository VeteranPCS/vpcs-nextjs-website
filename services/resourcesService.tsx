import { LIFE_RESOURCES, TRUSTED_RESOURCES } from '@/lib/content/resources';
import { toLegacyImage, type LegacyImage } from '@/lib/content/loader';

export interface LifeResourceProps {
    _id: string;
    _type: string;
    name: string;
    description: string;
    url: string;
    logo: LegacyImage;
}

export interface TrustedResourceProps {
    _id: string;
    _type: string;
    name: string;
    url?: string;
    logo: LegacyImage;
}

const blogService = {
    fetchLifeResources: async (): Promise<LifeResourceProps[]> => {
        return LIFE_RESOURCES.map((doc) => ({
            _id: doc._id,
            _type: doc._type,
            name: doc.name,
            description: doc.description,
            url: doc.url,
            logo: toLegacyImage(doc.logo),
        }));
    },
    fetchTrustedResources: async (): Promise<TrustedResourceProps[]> => {
        return TRUSTED_RESOURCES.map((doc) => ({
            _id: doc._id,
            _type: doc._type,
            name: doc.name,
            url: doc.url,
            logo: toLegacyImage(doc.logo),
        }));
    },
};

export default blogService;
