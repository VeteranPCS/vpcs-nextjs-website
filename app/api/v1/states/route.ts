import { NextResponse } from 'next/server';
import stateService, { type StateList } from '@/services/stateService';

interface StatesResponse {
  success: boolean;
  data?: StateList[];
  error?: string;
}

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse<StatesResponse>> {
  try {
    const states = await stateService.fetchStateList();
    return NextResponse.json({ success: true, data: states });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('States API error:', errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
