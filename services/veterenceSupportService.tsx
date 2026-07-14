import { VeteranCommunityProps } from '@/components/homepage/VeteranCommunity/VeteranCommunity';
import { getSupportVeterence } from '@/lib/content/homepage';
import { toLegacyImage } from '@/lib/content/loader';

// Data now comes from the repo-committed export in content/_data/site/ via
// lib/content/homepage (validated at module load); the response shape matches
// the old Sanity fetch so consumers don't churn. The rendered rich copy lives
// in components/homepage/supportVeterenceContent.tsx.
const veterenceSupportService = {
    fetchVeterenceSupport: async (slug: string): Promise<VeteranCommunityProps> => {
        const doc = getSupportVeterence(slug);
        if (!doc) {
            throw new Error(`Veterence Support document not found: ${slug}`);
        }
        return {
            _id: doc._id,
            title: doc.title,
            button_text: doc.button_text,
            description: doc.description,
            points: doc.points,
            image: toLegacyImage(doc.image),
            icon: toLegacyImage(doc.icon),
        };
    }
};

export default veterenceSupportService;
