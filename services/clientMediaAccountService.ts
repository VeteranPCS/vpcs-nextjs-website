import type { MediaAccountProps } from '@/services/mediaAccountTypes';

interface MediaAccountsResponse {
  success: boolean;
  data?: MediaAccountProps[];
  error?: string;
}

export const clientMediaAccountService = {
  fetchAccounts: async (): Promise<MediaAccountProps[]> => {
    const response = await fetch('/api/v1/media-accounts');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch media accounts`);
    }

    const data: MediaAccountsResponse = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch media accounts');
    }

    return data.data || [];
  },
};
