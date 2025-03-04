import AgentServices from "@/services/agentService";
import Slider from "@/components/common/Slider";


export default async function FeaturedLogos() {
    let agentList = null;

    try {
        agentList = await AgentServices.fetchAgentsList();
    } catch (error) {
        console.error('Error fetching Agent Data:', error);
        return <p>Failed to load Agent Data.</p>;
    }

    return (
        <Slider agentList={agentList} />
    );
}

