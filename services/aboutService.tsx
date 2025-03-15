import { TeamMember } from '@/components/About/AdminTeam/AdminTeam';
import { AboutVetPcsResponse } from '@/components/About/HowVetPcsStarted/HowVetPcsStarted'
import { SupportComponentProps } from '@/components/About/Support/SupportOurVeterans';
import { client } from "@/sanity/lib/client";
import { SanityDocument } from "@sanity/client";
import { urlForImage } from "@/sanity/lib/image";

interface MainImage {
    alt: string; // Alternative text for the image
    asset: {
        image_url?: string; // URL of the image
        _ref: string; // Reference ID for the image asset
        _type: string; // Type of the asset, typically "reference"
    };
    _type: "image"; // Type of the main image, typically "image"
}

interface MemberDetails extends SanityDocument {
    image: MainImage;
    name: string;
    designation: string;
    roles: string,
}
interface ReviewDocument extends SanityDocument {
    _type: "aboutUsPage";
    title: string;
    publishedAt: string;
}

const aboutService = {
    fetchMembersDetail: async (roles: string): Promise<TeamMember[]> => {
        try {
            const details = await client.fetch<TeamMember[]>(
                `*[_type == "member_info" && roles == $roles]`,
                { roles }
            )

            if (!details) {
                throw new Error('Member not found');
            }

            details.map((detail) => {
                if (detail.image?.asset?._ref) {
                    detail.image.asset.image_url = urlForImage(detail.image.asset); // Add the image URL to the response
                }
            })

            if (details) {
                return details as TeamMember[];
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

            const details = await client.fetch<ReviewDocument>(
                `*[_type == "aboutUsPage" && componentName == $component][0]`,
                { component }
            )

            if (!details) {
                throw new Error('Member not found');
            }

            if (details.background_image?.asset?._ref) {
                details.background_image.asset.image_url = urlForImage(details.background_image.asset); // Add the image URL to the response
            }

            if (details.foreground_image?.asset?._ref) {
                details.foreground_image.asset.image_url = urlForImage(details.foreground_image.asset); // Add the image URL to the response
            }

            if (details) {
                return details as AboutVetPcsResponse;
            } else {
                throw new Error('Failed to Fetch About Page Details');
            }
        } catch (error: any) {
            console.error('Error fetching About Page Details:', error);
            throw error;
        }
    },
    fetchSupportComponent: async (): Promise<SupportComponentProps> => {
        try {
            const details = await client.fetch(
                `*[_type == "aboutSupportComponent"][0]`
            )

            if (!details) {
                throw new Error('Member not found');
            }

            if (details.image?.asset?._ref) {
                details.image.asset.image_url = urlForImage(details.image.asset); // Add the image URL to the response
            }

            if (details) {
                return details as SupportComponentProps;
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
