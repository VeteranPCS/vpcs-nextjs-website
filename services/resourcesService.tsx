import { client } from '@/sanity/lib/client';
import { SanityDocument } from '@sanity/client';
import { urlForImage } from '@/sanity/lib/image';


interface LifeResource extends SanityDocument {
    logo?: {
        asset?: {
            _ref?: string;
            image_url?: string; // Adding a new field for the image URL
        };
    };
}

const blogService = {
    fetchLifeResources: async (): Promise<any> => {
        try {
            const life_resources: LifeResource[] = await client.fetch(`*[_type == "life_resources"]`);

            // Map over life resources to add image URLs
            life_resources.forEach((life_resource) => {
                if (life_resource?.logo?.asset?._ref) {
                    life_resource.logo.asset.image_url = urlForImage(life_resource.logo.asset);
                }
            });

            if (life_resources) {
                return life_resources;
            } else {
                throw new Error('Failed to fetch blog');
            }
        } catch (error: any) {
            console.error('Error fetching blogs:', error);
            throw error; // You can handle the error more gracefully based on your needs
        }
    },
    fetchTrustedResources: async (): Promise<any> => {
        try {
            const trusted_sources: LifeResource[] = await client.fetch(`*[_type == "trusted_resources"]`)

            trusted_sources.map((trusted_source) => {
                if (trusted_source?.logo?.asset?._ref) {
                    trusted_source.logo.asset.image_url = urlForImage(trusted_source.logo.asset);
                }
            })

            if (trusted_sources) {
                return trusted_sources;
            } else {
                throw new Error('Failed to fetch blog');
            }
        } catch (error: any) {
            console.error('Error fetching blogs:', error);
            throw error; // You can handle the error more gracefully based on your needs
        }
    },
};

export default blogService;
