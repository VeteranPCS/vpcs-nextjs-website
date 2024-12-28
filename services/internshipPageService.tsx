import { InternshipActionDataProps } from '@/components/Internship/internshipblogsection/internshipblogsection';
import { IntershipBenefitDataProps } from '@/components/Internship/Interashipdetails/Interashipdetails';
import { IntershipOfferDataProps } from '@/components/Internship/receiveoffcourses/receiveoffcourses';
import { client } from '@/sanity/lib/client';
import { urlForImage } from '@/sanity/lib/image';

const internshipPageService = {
    fetchActionItem: async (): Promise<InternshipActionDataProps[]> => {
        try {
            const actionItems = await client.fetch<InternshipActionDataProps[]>(`*[_type == "internship_action"]`);

            actionItems.forEach((item: InternshipActionDataProps) => {
                if (item.action_image?.asset?._ref) {
                    const imageUrl = urlForImage(item.action_image.asset);
                    if (item.action_image.asset) {
                        item.action_image.asset.image_url = imageUrl;
                    }
                }
            });

            if (actionItems) {
                return actionItems as InternshipActionDataProps[];
            } else {
                throw new Error('Failed to fetch Action Items');
            }
        } catch (error: any) {
            console.error('Error fetching Action Items:', error);
            throw error;
        }
    },
    fetchInternshipBenefits: async (): Promise<IntershipBenefitDataProps> => {
        try {
            const benefitItems = await client.fetch(`*[_type == "internship_benefits"][0]`);

            if (benefitItems.logo?.asset?._ref) {
                benefitItems.logo.asset.image_url = urlForImage(benefitItems.logo.asset); // Add the image URL to the response
            }

            if (benefitItems) {
                return benefitItems as IntershipBenefitDataProps;
            } else {
                throw new Error('Failed to fetch Internship Benefits');
            }
        } catch (error: any) {
            console.error('Error fetching Internship Benefits:', error);
            throw error;
        }
    },
    fetchInternshipOffer: async (): Promise<IntershipOfferDataProps> => {
        try {
            const benefitItems = await client.fetch(`*[_type == "internship_offer"][0]`);

            if (benefitItems) {
                return benefitItems as IntershipOfferDataProps;
            } else {
                throw new Error('Failed to fetch Internship Benefits');
            }
        } catch (error: any) {
            console.error('Error fetching Internship Benefits:', error);
            throw error;
        }
    },
};

export default internshipPageService;
