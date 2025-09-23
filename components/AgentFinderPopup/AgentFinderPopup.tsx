'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import stateService, { StateList } from '@/services/stateService';
import { clientAreaService, type AreaAssignment } from '@/services/clientAreaService';
import { sanitizeCityName } from '@/utils/sanitizeCityName';
import './AgentFinderPopup.css';


interface AgentFinderPopupProps {
    isVisible: boolean;
    onClose: () => void;
}

const AgentFinderPopup: React.FC<AgentFinderPopupProps> = ({ isVisible, onClose }) => {
    const router = useRouter();
    const [states, setStates] = useState<StateList[]>([]);
    const [selectedState, setSelectedState] = useState<string>('');
    const [selectedStateSlug, setSelectedStateSlug] = useState<string>('');
    const [areas, setAreas] = useState<AreaAssignment[]>([]);
    const [selectedArea, setSelectedArea] = useState<string>('');
    const [stateImage, setStateImage] = useState<string>('');
    const [isLoadingAreas, setIsLoadingAreas] = useState(false);

    // Load states on component mount
    useEffect(() => {
        const loadStates = async () => {
            try {
                const statesData = await stateService.fetchStateList();

                if (!statesData || statesData.length === 0) {
                    console.warn('No states data received from Sanity');
                    return;
                }

                // Check if state_slug exists on the first item
                if (statesData[0] && !statesData[0].state_slug) {
                    console.error('state_slug field missing from Sanity response:', statesData[0]);
                }

                // Sort states alphabetically by state name
                const sortedStates = statesData
                    .filter(state => state.state_slug) // Filter out items without state_slug
                    .sort((a, b) => a.state_slug.current.localeCompare(b.state_slug.current));

                console.log(`Loaded ${sortedStates.length} states from Sanity`);
                setStates(sortedStates);
            } catch (error) {
                console.error('Error loading states:', error);
            }
        };

        loadStates();
    }, []);

    // Load areas when state changes
    useEffect(() => {
        const loadAreasForState = async () => {
            if (!selectedState || !selectedStateSlug) {
                setAreas([]);
                setSelectedArea('');
                // Only clear image if no state is selected, not during intermediate state
                if (!selectedState) {
                    setStateImage('');
                }
                return;
            }

            setIsLoadingAreas(true);
            try {
                // Load state image
                const imageUrl = await stateService.fetchStateImage(selectedStateSlug);
                setStateImage(imageUrl);

                // Load areas from API route (server-side)
                const sortedAreas = await clientAreaService.fetchAreasByState(selectedState);

                setAreas(sortedAreas);
                setSelectedArea('');
            } catch (error) {
                console.error('Error loading areas for state:', error);
                setAreas([]);
                // Don't clear the state image on area loading error
                // setStateImage(''); 
            } finally {
                setIsLoadingAreas(false);
            }
        };

        loadAreasForState();
    }, [selectedState, selectedStateSlug]);


    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const stateAbbr = e.target.value;
        const selectedStateData = states.find(state => state.short_name === stateAbbr);
        const stateSlug = selectedStateData?.state_slug.current || '';

        // Batch state updates to prevent intermediate renders
        React.startTransition(() => {
            setSelectedState(stateAbbr);
            setSelectedStateSlug(stateSlug);
            // Reset area selection when state changes
            setSelectedArea('');
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedStateSlug || !selectedArea) {
            return;
        }

        // Find the area name to sanitize for the anchor
        const selectedAreaData = areas.find(area => area.slug === selectedArea);
        const sanitizedAreaName = selectedAreaData ? sanitizeCityName(selectedAreaData.name) : sanitizeCityName(selectedArea);

        // Navigate to the state page with sanitized area anchor
        const url = `/${selectedStateSlug}#${sanitizedAreaName}`;
        router.push(url);
        onClose();
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="agent-finder-popup-backdrop" onClick={handleBackdropClick}>
            <div className="agent-finder-popup">
                <button
                    className="agent-finder-popup__close"
                    onClick={onClose}
                    aria-label="Close popup"
                >
                    ×
                </button>

                <div className="agent-finder-popup__content">
                    <h2 className="agent-finder-popup__title">Need to find a real estate agent?</h2>
                    <p className="agent-finder-popup__subtitle">Select the area you need an agent.</p>

                    {stateImage && (
                        <div className="agent-finder-popup__image">
                            <Image
                                src={stateImage}
                                alt={`${selectedState} map`}
                                width={250}
                                height={250}
                                className="object-contain"
                            />
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="agent-finder-popup__form">
                        <div className="agent-finder-popup__field">
                            <label htmlFor="state-select" className="agent-finder-popup__label">
                                Select State
                            </label>
                            <select
                                id="state-select"
                                value={selectedState}
                                onChange={handleStateChange}
                                className="agent-finder-popup__select"
                                required
                            >
                                <option value="">Choose a state...</option>
                                {states.map((state) => (
                                    <option key={state.short_name} value={state.short_name}>
                                        {state.state_slug.current
                                            .replace(/-/g, " ") // Replace hyphens with spaces
                                            .toLowerCase()      // Convert to lowercase
                                            .split(" ")         // Split into words
                                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
                                            .join(" ")
                                        }
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="agent-finder-popup__field">
                            <label htmlFor="area-select" className="agent-finder-popup__label">
                                Select Area
                            </label>
                            <select
                                id="area-select"
                                value={selectedArea}
                                onChange={(e) => setSelectedArea(e.target.value)}
                                className="agent-finder-popup__select"
                                disabled={!selectedState || isLoadingAreas}
                                required
                            >
                                <option value="">
                                    {isLoadingAreas ? 'Loading areas...' : 'Choose an area...'}
                                </option>
                                {areas.map((area) => (
                                    <option key={area.slug} value={area.slug}>
                                        {area.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="agent-finder-popup__submit"
                            disabled={!selectedState || !selectedArea || isLoadingAreas}
                        >
                            Find Agents
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AgentFinderPopup;
