import { memo } from "react"
import AgentServices from "@/services/agentService";
import Slider from "@/components/common/Slider";

const MemoizedSlider = memo(Slider);

export default async function Agent() {
    let agentList = null;

    try {
        agentList = await AgentServices.fetchAgentsList();
    } catch (error) {
        console.error('Error fetching Agent Data:', error);
        return <p>Failed to load Agent Data.</p>;
    }

    return (
        <MemoizedSlider agentList={agentList} />
    );
}

