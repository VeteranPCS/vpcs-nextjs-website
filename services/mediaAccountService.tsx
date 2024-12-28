import { MediaAccountProps } from '@/components/homepage/KeepInTouch/KeepInTouch';
import { client } from '@/sanity/lib/client'
import { SanityDocument } from '@sanity/client'


interface AccountDocument extends SanityDocument {
    _type: 'media_account'
}

const mediaAccountService = {
    fetchAccounts: async (): Promise<MediaAccountProps[]> => {
        try {
            const mediaAccounts = await client.fetch<MediaAccountProps[]>(`*[_type == "media_account"]`)

            if (mediaAccounts) {
                return mediaAccounts as MediaAccountProps[];
            } else {
                throw new Error('Failed to fetch Internship Benefits');
            }
        } catch (error: any) {
            console.error('Error fetching Internship Benefits:', error);
            throw error;
        }
    }
};

export default mediaAccountService;
