import type { StateList } from '@/services/stateService';

interface StatesResponse {
  success: boolean;
  data?: StateList[];
  error?: string;
}

interface StateImageResponse {
  success: boolean;
  data?: { imageUrl: string };
  error?: string;
}

export const clientStateService = {
  fetchStateList: async (): Promise<StateList[]> => {
    const response = await fetch('/api/v1/states');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch states`);
    }

    const data: StatesResponse = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch states');
    }

    return data.data || [];
  },

  fetchStateImage: async (stateSlug: string): Promise<string> => {
    const response = await fetch(`/api/v1/states/${encodeURIComponent(stateSlug)}/image`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch state image`);
    }

    const data: StateImageResponse = await response.json();
    if (!data.success || !data.data?.imageUrl) {
      throw new Error(data.error || 'Failed to fetch state image');
    }

    return data.data.imageUrl;
  },
};
