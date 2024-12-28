import { VeteranCommunityProps } from '@/components/homepage/VeteranCommunity/VeteranCommunity';
import { client } from '@/sanity/lib/client';
import { urlForImage } from '@/sanity/lib/image';
import { SanityDocument } from 'sanity';

interface ReviewDocument extends SanityDocument {
    _type: string;
    title: string;
    publishedAt: string;
    slug: {
        current: string;
    };
    image: {
        asset: {
            image_url: string;
            _ref: string;
        };
        alt: string;
    };
    icon: {
        asset: {
            image_url: string;
            _ref: string;
        };
        alt: string;
    }
}

const veterenceSupportService = {
    fetchVeterenceSupport: async (slug: string): Promise<VeteranCommunityProps> => {
        try {
            const post = await client.fetch<ReviewDocument>(
                `*[_type == "support_veterence" && slug.current == $slug][0]`,
                { slug }
            );

            if (post.image?.asset?._ref) {
                post.image.asset.image_url = urlForImage(post.image.asset); // Add the image URL to the response
            }

            if (post.icon?.asset?._ref) {
                post.icon.asset.image_url = urlForImage(post.icon.asset); // Add the image URL to the response
            }

            if (post) {
                return post;
            } else {
                throw new Error('Failed to fetch Veterence Support Data');
            }
        } catch (error: any) {
            console.error('Error fetching Veterence Support Data:', error);
            throw error;
        }
    }
};

export default veterenceSupportService;