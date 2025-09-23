'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseScrollTriggerOptions {
    triggerElementId?: string;
    offset?: number;
    cooldownDuration?: number; // Time to wait before showing popup again (in ms)
}

export const useScrollTrigger = ({
    triggerElementId = 'state-map-component',
    offset = 100,
    cooldownDuration = 60000 // 1 minute default cooldown
}: UseScrollTriggerOptions = {}) => {
    const [showPopup, setShowPopup] = useState(false);
    const [hasTriggered, setHasTriggered] = useState(false);
    const [lastDismissTime, setLastDismissTime] = useState<number | null>(null);

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

    const handleScroll = useCallback(() => {
        if (!isDesktop || hasTriggered) return;

        // Check cooldown period
        if (lastDismissTime && Date.now() - lastDismissTime < cooldownDuration) {
            return;
        }

        const triggerElement = document.getElementById(triggerElementId);
        if (!triggerElement) {
            console.warn(`Element with id "${triggerElementId}" not found`);
            return;
        }

        const rect = triggerElement.getBoundingClientRect();
        const elementBottom = rect.bottom;

        // Trigger when the element has scrolled past the viewport plus offset
        if (elementBottom + offset < 0) {
            console.log('Popup triggered by scroll');
            setShowPopup(true);
            setHasTriggered(true);
        }
    }, [isDesktop, hasTriggered, lastDismissTime, cooldownDuration, triggerElementId, offset]);

    useEffect(() => {
        if (!isDesktop) return;

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll, isDesktop]);

    const closePopup = useCallback(() => {
        setShowPopup(false);
        setLastDismissTime(Date.now());

        // Reset trigger after cooldown to allow showing again
        setTimeout(() => {
            setHasTriggered(false);
        }, cooldownDuration);
    }, [cooldownDuration]);

    const resetTrigger = useCallback(() => {
        setHasTriggered(false);
        setLastDismissTime(null);
    }, []);

    return {
        showPopup: showPopup && isDesktop,
        closePopup,
        resetTrigger,
        isDesktop
    };
};
