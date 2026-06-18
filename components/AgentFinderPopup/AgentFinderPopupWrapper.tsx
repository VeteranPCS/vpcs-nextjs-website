'use client';

import React from 'react';
import AgentFinderPopup from './AgentFinderPopup';
import { useScrollTrigger } from './useScrollTrigger';

const AgentFinderPopupWrapper: React.FC = () => {
    const { showPopup, closePopup } = useScrollTrigger({
        triggerElementId: 'state-map',
        offset: 100,
        cooldownDuration: 60000 // 1 minute cooldown
    });

    const handleClose = () => {
        closePopup();
    };

    return (
        <>
            <AgentFinderPopup
                isVisible={showPopup}
                onClose={handleClose}
            />
        </>
    );
};

export default AgentFinderPopupWrapper;
