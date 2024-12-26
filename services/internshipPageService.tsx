import { API_ENDPOINTS } from '@/constants/api'
import { api, RequestType } from '@/services/api';
import { InternshipActionDataProps } from '@/components/Internship/internshipblogsection/internshipblogsection';
import { IntershipBenefitDataProps } from '@/components/Internship/Interashipdetails/Interashipdetails';
import { IntershipOfferDataProps } from '@/components/Internship/receiveoffcourses/receiveoffcourses';

const internshipPageService = {
    fetchActionItem: async (): Promise<InternshipActionDataProps[]> => {
        try {
            const response = await api({
                endpoint: API_ENDPOINTS.fetchActionItem,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data as InternshipActionDataProps[];
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
            const response = await api({
                endpoint: API_ENDPOINTS.fetchInternshipBenefits,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data as IntershipBenefitDataProps;
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
            const response = await api({
                endpoint: API_ENDPOINTS.fetchInternshipOffer,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data as IntershipOfferDataProps;
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
