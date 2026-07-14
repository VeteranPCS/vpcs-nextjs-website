import { InternshipActionDataProps } from '@/components/Internship/internshipblogsection/internshipblogsection';
import { IntershipBenefitDataProps } from '@/components/Internship/Interashipdetails/Interashipdetails';
import { IntershipOfferDataProps } from '@/components/Internship/receiveoffcourses/receiveoffcourses';
import { INTERNSHIP_ACTIONS, INTERNSHIP_BENEFITS, INTERNSHIP_OFFER } from '@/lib/content/internship';
import { toLegacyImage } from '@/lib/content/loader';

const internshipPageService = {
    fetchActionItem: async (): Promise<InternshipActionDataProps[]> => {
        return INTERNSHIP_ACTIONS.map((item) => ({
            _id: item._id,
            title: item.title,
            description: item.description,
            action_image: toLegacyImage(item.action_image),
        }));
    },
    fetchInternshipBenefits: async (): Promise<IntershipBenefitDataProps> => {
        return {
            _id: INTERNSHIP_BENEFITS._id,
            title: INTERNSHIP_BENEFITS.title,
            logo: toLegacyImage(INTERNSHIP_BENEFITS.logo),
            description: INTERNSHIP_BENEFITS.description,
        };
    },
    fetchInternshipOffer: async (): Promise<IntershipOfferDataProps> => {
        return {
            title: INTERNSHIP_OFFER.title,
            details: INTERNSHIP_OFFER.details,
            button_text: INTERNSHIP_OFFER.button_text,
        };
    },
};

export default internshipPageService;
