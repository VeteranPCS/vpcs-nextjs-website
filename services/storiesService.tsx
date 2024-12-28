import { client } from '@/sanity/lib/client'

export type VideoSuccessStory = {
    _createdAt: string;
    _id: string;
    _rev: string;
    _type: 'video_success_stories';
    description: ChildrenProps[]; // Change this from `ChildrenProps` to `ChildrenProps[]`
    title: string;
    videoUrl: string;
    _updatedAt: string;
};

export type ChildrenProps = {
    _key: string;
    _type: string;
    children: DescriptionChild[];
    level: number;
    listItem: string;
    markDefs: any[]; // Adjust based on your actual data
    style: string;
};

interface DescriptionChild {
    _key: string;
    _type: string;
    marks: string[];
    text: string;
}

const storiesService = {
    fetchVideoSuccessStories: async (): Promise<VideoSuccessStory[]> => {
        try {
            const additionalStories = await client.fetch<VideoSuccessStory[]>(`*[_type == "video_success_stories"]`);

            if (additionalStories) {
                return additionalStories as VideoSuccessStory[];
            } else {
                throw new Error('Failed to fetch Video Success Stories');
            }
        } catch (error: any) {
            console.error('Error fetching Video Success Stories:', error);
            throw error;
        }
    }
};

export default storiesService;