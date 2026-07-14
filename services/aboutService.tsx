import { TeamMember } from '@/components/About/AdminTeam/AdminTeam';
import { AboutVetPcsResponse } from '@/components/About/HowVetPcsStarted/HowVetPcsStarted'
import { SupportComponentProps } from '@/components/About/Support/SupportOurVeterans';
import { ABOUT_SUPPORT_COMPONENT, getAboutUsPage, getMembersByRole } from '@/lib/content/about';
import type { ContentImage } from '@/lib/content/loader';

// The Sanity-era responses exposed images as image.asset.image_url (a CDN
// URL). Keep that shape so consumers don't churn; the URL is now the local
// public/ path from the repo-committed export.
function toLegacyImage(image: ContentImage): { alt: string; asset: { image_url: string } };
function toLegacyImage(image: ContentImage | undefined): { alt: string; asset: { image_url: string } } | undefined;
function toLegacyImage(image: ContentImage | undefined) {
    if (!image) return undefined;
    return { alt: image.alt, asset: { image_url: image.path } };
}

const aboutService = {
    fetchMembersDetail: async (roles: string): Promise<TeamMember[]> => {
        return getMembersByRole(roles).map((member) => ({
            _id: member._id,
            name: member.name,
            designation: member.designation,
            image: toLegacyImage(member.image),
            description: member.description,
        }));
    },
    fetchOverviewDetails: async (component: string): Promise<AboutVetPcsResponse> => {
        const page = getAboutUsPage(component);
        if (!page) {
            throw new Error(`About page component not found: ${component}`);
        }
        return {
            header: page.header,
            description: page.description,
            buttonText: page.buttonText,
            background_image: toLegacyImage(page.background_image),
            foreground_image: toLegacyImage(page.foreground_image),
        };
    },
    fetchSupportComponent: async (): Promise<SupportComponentProps> => {
        return {
            _id: ABOUT_SUPPORT_COMPONENT._id,
            header_1: ABOUT_SUPPORT_COMPONENT.header_1,
            header_2: ABOUT_SUPPORT_COMPONENT.header_2,
            description_1: ABOUT_SUPPORT_COMPONENT.description_1,
            description_2: ABOUT_SUPPORT_COMPONENT.description_2,
            buttonText_1: ABOUT_SUPPORT_COMPONENT.buttonText_1,
            buttonText_2: ABOUT_SUPPORT_COMPONENT.buttonText_2,
            image: toLegacyImage(ABOUT_SUPPORT_COMPONENT.image),
        };
    },
};

export default aboutService;
