import AgentServices from "@/services/agentService";
import Slider from "@/components/common/Slider";


export default async function FeaturedLogos() {
    let logoList = null;

    try {
        logoList = await AgentServices.fetchLogosList();
    } catch (error) {
        console.error('Error fetching Logo Data:', error);
        return <p>Failed to load Logo Data.</p>;
    }

    return (
        <Slider logoList={logoList} />
    );
}

