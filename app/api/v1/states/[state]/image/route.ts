import { NextResponse } from 'next/server';
import stateService from '@/services/stateService';

interface StateImageResponse {
  success: boolean;
  data?: { imageUrl: string };
  error?: string;
}

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  props: { params: Promise<{ state: string }> },
): Promise<NextResponse<StateImageResponse>> {
  try {
    const { state } = await props.params;
    if (!/^[a-z0-9-]+$/i.test(state)) {
      return NextResponse.json(
        { success: false, error: 'Invalid state slug' },
        { status: 400 },
      );
    }

    const imageUrl = await stateService.fetchStateImage(state);
    return NextResponse.json({ success: true, data: { imageUrl } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('State image API error:', errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
