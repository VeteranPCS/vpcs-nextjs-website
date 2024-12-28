import { additionalStoriesProps } from '@/components/stories/optionssection/OptionsSection';
import { OurStoryProps } from '@/components/Impact/AboutOurStory/AboutOurStory';
import { WearBlueSectionProps } from '@/components/Impact/WearBlueSection/WearBlueSection';
import { client } from '@/sanity/lib/client'
import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image'

interface ReviewDocument extends SanityDocument {
    _type: 'additionalSuccessStories'
    title: string
    publishedAt: string
}

interface ImageAsset {
    _ref: string;
    _type?: string; // Add _type if expected by urlForImage
    [key: string]: any; // Add index signature for flexibility
    image_url?: string; // Optional field for the URL
}

interface Poster {
    asset?: ImageAsset;
}

interface AccountDocument extends SanityDocument {
    _type: 'stories_poster';
    poster_1?: Poster;
    poster_2?: Poster;
}

const impactService = {
    fetchAdditionalStories: async (): Promise<additionalStoriesProps[]> => {
        try {
            const additionalStories = await client.fetch<ReviewDocument[]>(`*[_type == "additionalSuccessStories"]`)

            additionalStories.forEach((review) => {
                if (review.image?.asset?._ref) {
                    review.image.asset.image_url = urlForImage(review.image.asset);  // Add the image URL to the response
                }
            })

            if (additionalStories) {
                return additionalStories as additionalStoriesProps[];
            } else {
                throw new Error('Failed to fetch Additional Impact Stories');
            }
        } catch (error: any) {
            console.error('Error fetching Additional Impact Stories:', error);
            throw error;
        }
    },
    fetchOurStory: async (): Promise<OurStoryProps> => {
        try {
            const impact_data = await client.fetch<AccountDocument>(`*[_type == "impact_page"][0]`)

            if (impact_data?.foreground_image?.asset?._ref) {
                impact_data.foreground_image.asset.image_url = urlForImage(impact_data.foreground_image.asset);
            }

            if (impact_data) {
                return impact_data as OurStoryProps;
            } else {
                throw new Error('Failed to fetch Additional Impact Stories');
            }
        } catch (error: any) {
            console.error('Error fetching Additional Impact Stories:', error);
            throw error;
        }
    },
    fetchSuccessStories: async (): Promise<WearBlueSectionProps> => {
        try {
            const story = await client.fetch<AccountDocument>(`*[_type == "stories_poster"][0]`);

            if (story?.poster_1?.asset?._ref) {
                story.poster_1.asset.image_url = urlForImage(story.poster_1.asset);
            }

            if (story?.poster_2?.asset?._ref) {
                story.poster_2.asset.image_url = urlForImage(story.poster_2.asset);
            }

            if (story) {
                return story as WearBlueSectionProps;
            } else {
                throw new Error('Failed to fetch Success Stories');
            }
        } catch (error: any) {
            console.error('Error fetching Success Stories:', error);
            throw error;
        }
    },
};

export default impactService;
