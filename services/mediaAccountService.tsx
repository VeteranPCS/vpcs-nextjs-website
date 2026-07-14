import { MEDIA_ACCOUNTS } from '@/lib/content/mediaAccounts';
import type { MediaAccountProps } from '@/services/mediaAccountTypes';

// Data now comes from the repo-committed export in content/_data/site/ via
// lib/content/mediaAccounts (validated at module load); the Sanity query had
// no projection, so the full document shape is preserved for consumers.
const mediaAccountService = {
    fetchAccounts: async (): Promise<MediaAccountProps[]> => {
        return [...MEDIA_ACCOUNTS];
    }
};

export default mediaAccountService;
