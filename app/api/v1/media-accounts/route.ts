import { NextResponse } from 'next/server';
import mediaAccountService from '@/services/mediaAccountService';
import type { MediaAccountProps } from '@/services/mediaAccountTypes';

interface MediaAccountsResponse {
  success: boolean;
  data?: MediaAccountProps[];
  error?: string;
}

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse<MediaAccountsResponse>> {
  try {
    const accounts = await mediaAccountService.fetchAccounts();
    return NextResponse.json({ success: true, data: accounts });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Media accounts API error:', errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
