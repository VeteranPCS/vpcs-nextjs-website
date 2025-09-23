'use client';

import React, { useState } from 'react';
import AgentFinderPopup from './AgentFinderPopup';
import { useScrollTrigger } from './useScrollTrigger';

const AgentFinderPopupWrapper: React.FC = () => {
    const { showPopup, closePopup } = useScrollTrigger({
        triggerElementId: 'state-map-component',
        offset: 100,
        cooldownDuration: 60000 // 1 minute cooldown
    });

    // Add manual trigger for testing
    const [manualShow, setManualShow] = useState(false);

    const handleManualTrigger = () => {
        console.log('Manual popup trigger');
        setManualShow(true);
    };

    const handleClose = () => {
        setManualShow(false);
        closePopup();
    };

    // For development - add a button to manually trigger popup
    const isDev = process.env.NODE_ENV === 'development';

    return (
        <>
            {isDev && (
                <button
                    onClick={handleManualTrigger}
                    style={{
                        position: 'fixed',
                        top: '10px',
                        right: '10px',
                        zIndex: 10000,
                        padding: '10px',
                        backgroundColor: '#ff0000',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px'
                    }}
                >
                    Test Popup
                </button>
            )}
            <AgentFinderPopup
                isVisible={showPopup || manualShow}
                onClose={handleClose}
            />
        </>
    );
};

export default AgentFinderPopupWrapper;
