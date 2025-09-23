interface AreaAssignment {
    name: string;
    slug: string;
}

interface AreasResponse {
    success: boolean;
    data?: AreaAssignment[];
    error?: string;
}

export const clientAreaService = {
    fetchAreasByState: async (stateCode: string): Promise<AreaAssignment[]> => {
        try {
            console.log('Fetching areas from API for state:', stateCode);

            const response = await fetch(`/api/areas?state=${stateCode}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to fetch areas`);
            }

            const data: AreasResponse = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch areas');
            }

            console.log(`Loaded ${data.data?.length || 0} areas for ${stateCode}`);
            return data.data || [];

        } catch (error) {
            console.error('Error fetching areas:', error);
            throw error;
        }
    }
};

export type { AreaAssignment };
