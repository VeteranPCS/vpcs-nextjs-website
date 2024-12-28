import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image'
import { client } from '@/sanity/lib/client'

interface MainImage {
    alt: string; // Alternative text for the image
    asset: {
        image_url: string; // URL of the image
        _ref: string; // Reference ID for the image asset
        _type: string; // Type of the asset, typically "reference"
    };
    _type: "image"; // Type of the main image, typically "image"
}

interface AgentDocument extends SanityDocument {
    mainImage: MainImage;
    publishedAt: string;
    title: string;
    _createdAt: string;
    _id: string;
    _rev: string;
    _type: 'agents';
    _updatedAt: string;
}

const AgentServices = {
    fetchAgentsList: async (): Promise<AgentDocument[]> => {
        try {
            const agents = await client.fetch<AgentDocument[]>(`*[_type == "real-state-agents"]`);

            agents.forEach((agent) => {
                if (agent.mainImage?.asset?._ref) {
                    agent.mainImage.asset.image_url = urlForImage(agent.mainImage.asset);
                }
            });

            if (agents) {
                return agents;
            } else {
                throw new Error('Failed to Fetch About Page Details');
            }
        } catch (error: any) {
            console.error('Error fetching About Page Details:', error);
            throw error; // You can handle the error more gracefully based on your needs
        }
    },
};

export default AgentServices;