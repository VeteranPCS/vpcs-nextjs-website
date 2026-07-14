import { UserImage } from '@/components/common/ImageSlider';
import { USERS } from '@/lib/content/homepage';

// Data now comes from the repo-committed export in content/_data/site/ via
// lib/content/homepage (validated at module load); the response shape matches
// the old Sanity fetch so consumers don't churn.
const userImageServices = {
    fetchImages: async (): Promise<UserImage[]> => {
        return USERS.map((user) => ({
            _id: user._id,
            userImage: {
                alt: user.userImage.alt,
                asset: {
                    image_url: user.userImage.path,
                    // Original Sanity asset id, kept for shape compatibility.
                    _ref: user.userImage._sanityAssetId ?? '',
                },
            },
        }));
    }
};

export default userImageServices;
