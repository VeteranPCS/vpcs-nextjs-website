import { additionalStoriesProps } from '@/components/stories/optionssection/OptionsSection';
import { OurStoryProps } from '@/components/Impact/AboutOurStory/AboutOurStory';
import { WearBlueSectionProps } from '@/components/Impact/WearBlueSection/WearBlueSection';
import { ADDITIONAL_SUCCESS_STORIES, IMPACT_OUR_STORY, STORIES_POSTER } from '@/lib/content/impact';
import { toLegacyImage } from '@/lib/content/loader';

// Data now comes from the repo-committed export in content/_data/site/ via
// lib/content/impact (validated at module load); the response shapes match
// the old Sanity fetches so consumers don't churn.
const impactService = {
    fetchAdditionalStories: async (): Promise<additionalStoriesProps[]> => {
        return ADDITIONAL_SUCCESS_STORIES.map((story) => ({
            _id: story._id,
            title: story.title,
            Description: story.Description,
            image: toLegacyImage(story.image),
        }));
    },
    fetchOurStory: async (): Promise<OurStoryProps> => {
        return {
            header: IMPACT_OUR_STORY.header,
            description: IMPACT_OUR_STORY.description,
            buttonText: IMPACT_OUR_STORY.buttonText,
            foreground_image: toLegacyImage(IMPACT_OUR_STORY.foreground_image),
        };
    },
    fetchSuccessStories: async (): Promise<WearBlueSectionProps> => {
        return {
            _id: STORIES_POSTER._id,
            title: STORIES_POSTER.title,
            description: STORIES_POSTER.description,
            button_text: STORIES_POSTER.button_text,
            poster_1: toLegacyImage(STORIES_POSTER.poster_1),
            poster_2: toLegacyImage(STORIES_POSTER.poster_2),
        };
    },
};

export default impactService;
