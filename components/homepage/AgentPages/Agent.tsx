"use client"
import { useCallback, memo, useEffect, useState } from "react"
import AgentServices from "@/services/agentService";
import Slider from "@/components/common/Slider";

const MemoizedSlider = memo(Slider);

export default function Agent() {
    const [agentList, setAgentList] = useState([]);

    const fetchAgents = useCallback(async () => {
        try {
            const response = await AgentServices.fetchAgentsList();
            if (!response.ok) throw new Error('Failed to fetch Agents');
            const data = await response.json();
            setAgentList(data);
        } catch (error) {
            console.error('Error fetching Agents:', error);
        }
    }, []);

    useEffect(() => {
        fetchAgents()
    }, [fetchAgents])

    return (
        <MemoizedSlider agentList={agentList} />
    );
}

