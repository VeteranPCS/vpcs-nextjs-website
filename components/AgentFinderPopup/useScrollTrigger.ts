'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseScrollTriggerOptions {
    triggerElementId?: string;
    offset?: number;
}

// Fire the popup at most once per browser session. The guard is persisted in
// sessionStorage so it also survives a same-session reload; it clears when the
// tab/session ends, so a fresh visit can see it again.
const SESSION_STORAGE_KEY = 'vpcs_agent_finder_popup_shown';

export const useScrollTrigger = ({
    triggerElementId = 'state-map',
    offset = 100,
}: UseScrollTriggerOptions = {}) => {
    const [showPopup, setShowPopup] = useState(false);
    // Once true, the scroll handler never shows the popup again this session.
    const [hasTriggered, setHasTriggered] = useState(false);

    // Check if we're on desktop (not mobile)
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        const checkIfDesktop = () => {
            setIsDesktop(window.innerWidth >= 768);
        };

        checkIfDesktop();
        window.addEventListener('resize', checkIfDesktop);

        return () => window.removeEventListener('resize', checkIfDesktop);
    }, []);

    // If the popup already fired earlier this session, keep it suppressed after a reload.
    useEffect(() => {
        // sessionStorage can throw (e.g. all cookies/storage blocked); degrade to
        // "popup may show again" instead of crashing to the error boundary.
        try {
            if (sessionStorage.getItem(SESSION_STORAGE_KEY)) {
                setHasTriggered(true);
            }
        } catch {
            // Storage unavailable — skip the persisted guard.
        }
    }, []);

    const handleScroll = useCallback(() => {
        if (hasTriggered) return;

        const triggerElement = document.getElementById(triggerElementId);
        if (!triggerElement) {
            console.warn(`Element with id "${triggerElementId}" not found`);
            return;
        }

        const rect = triggerElement.getBoundingClientRect();
        const elementBottom = rect.bottom;

        // Trigger when the element has scrolled past the viewport plus offset
        if (elementBottom + offset < 0) {
            setShowPopup(true);
            setHasTriggered(true);
            try {
                sessionStorage.setItem(SESSION_STORAGE_KEY, '1');
            } catch {
                // Storage unavailable — in-memory hasTriggered still suppresses re-fires this page load.
            }
        }
    }, [hasTriggered, triggerElementId, offset]);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    // Closing does not re-arm the trigger: the sessionStorage guard keeps it
    // suppressed for the rest of the session.
    const closePopup = useCallback(() => {
        setShowPopup(false);
    }, []);

    return {
        showPopup,
        closePopup,
        isDesktop
    };
};
