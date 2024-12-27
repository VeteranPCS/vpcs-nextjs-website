import { API_ENDPOINTS } from '@/constants/api'
import { api, RequestType } from '@/services/api';
import { client } from '@/sanity/lib/client';
import { urlForImage } from '@/sanity/lib/image';
import { UserImage } from '@/components/common/ImageSlider';

const userImageServices = {
    fetchImages: async () => {
        try {

            const users = await client.fetch<UserImage[]>(`*[_type == "users"] { userImage }`)

            users.forEach((user) => {
                if (user.userImage?.asset?._ref) {
                    user.userImage.asset.image_url = urlForImage(user.userImage.asset);  // Add the image URL to the response
                }
            })

            if (users) {
                return users;
            } else {
                throw new Error('Failed to fetch Images');
            }
        } catch (error: any) {
            console.error('Error fetching Images:', error);
            throw error;
        }
    }
};

export default userImageServices;