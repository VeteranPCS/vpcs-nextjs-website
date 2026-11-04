import { getIntakeMaintenanceStatus } from '@/lib/leads/intake-maintenance-server';

export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json(await getIntakeMaintenanceStatus(), {
    headers: { 'Cache-Control': 'no-store, max-age=0', 'CDN-Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store' },
  });
}
