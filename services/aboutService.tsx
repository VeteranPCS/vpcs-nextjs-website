import { API_ENDPOINTS } from '@/constants/api'
import { api, RequestType } from '@/services/api';
import { TeamMember } from '@/components/About/AdminTeam/AdminTeam';
import { AboutVetPcsResponse } from '@/components/About/HowVetPcsStarted/HowVetPcsStarted'
import { SupportSpanishProps } from '@/components/spanishpage/SupportSpanish/SupportSpanis';

const aboutService = {
    fetchMembersDetail: async (roles: string): Promise<TeamMember[]> => {
        try {
            const response = await api({
                endpoint: `${API_ENDPOINTS.members}?roles=${roles}`,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data as TeamMember[];
            } else {
                throw new Error('Failed to Fetch Members Details');
            }
        } catch (error: any) {
            console.error('Error fetching Members Details:', error);
            throw error;
        }
    },
    fetchOverviewDetails: async (component: string): Promise<AboutVetPcsResponse> => {
        try {
            const response = await api({
                endpoint: `${API_ENDPOINTS.aboutUsOverview}?component=${component}`,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data as AboutVetPcsResponse;
            } else {
                throw new Error('Failed to Fetch About Page Details');
            }
        } catch (error: any) {
            console.error('Error fetching About Page Details:', error);
            throw error;
        }
    },
    fetchSupportComponent: async (): Promise<SupportSpanishProps> => {
        try {
            const response = await api({
                endpoint: API_ENDPOINTS.aboutUsSupport,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data as SupportSpanishProps;
            } else {
                throw new Error('Failed to Fetch About Page Details');
            }
        } catch (error: any) {
            console.error('Error fetching About Page Details:', error);
            throw error; // You can handle the error more gracefully based on your needs
        }
    },
};

export default aboutService;
