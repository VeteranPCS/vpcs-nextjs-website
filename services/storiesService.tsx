import { VIDEO_SUCCESS_STORIES } from '@/lib/content/stories';

export type VideoSuccessStory = {
    _createdAt: string;
    _id: string;
    _type: 'video_success_stories';
    description: ChildrenProps[];
    title: string;
    videoUrl: string;
    _updatedAt: string;
};

export type ChildrenProps = {
    _key: string;
    _type: string;
    children: DescriptionChild[];
    level?: number;
    listItem?: string;
    markDefs: any[]; // Adjust based on your actual data
    style: string;
};

interface DescriptionChild {
    _key: string;
    _type: string;
    marks: string[];
    text: string;
}

// Data now comes from the repo-committed export in content/_data/site/ via
// lib/content/stories (validated at module load); the response shape matches
// the old Sanity fetch so consumers don't churn.
const storiesService = {
    fetchVideoSuccessStories: async (): Promise<VideoSuccessStory[]> => {
        return VIDEO_SUCCESS_STORIES.map((story) => ({
            _createdAt: story._createdAt,
            _id: story._id,
            _type: story._type,
            description: story.description,
            title: story.title,
            videoUrl: story.videoUrl,
            _updatedAt: story._updatedAt,
        }));
    }
};

export default storiesService;
