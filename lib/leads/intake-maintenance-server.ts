import 'server-only';
import { INTAKE_MAINTENANCE_START, INTAKE_MAINTENANCE_NOTICE, INTAKE_MAINTENANCE_EXTENDED_NOTICE } from './intake-maintenance';
import { isIntakeExplicitlyReopened } from './intake-reopening-store';

/** Scheduled production intake reopens only through the shared dated flag, never a timer. */
export async function getIntakeMaintenanceStatus(now = Date.now()) {
  const mode = process.env.LEAD_INTAKE_MAINTENANCE?.trim().toLowerCase() || 'off';
  let active = mode === 'scheduled' ? now >= Date.parse(INTAKE_MAINTENANCE_START) : mode !== 'off';
  if (mode === 'scheduled' && active && process.env.VERCEL_ENV === 'production') {
    active = !await isIntakeExplicitlyReopened();
  }
  return {
    active,
    message: now < Date.parse('2026-11-08T09:00:00.000Z') ? INTAKE_MAINTENANCE_NOTICE : INTAKE_MAINTENANCE_EXTENDED_NOTICE,
  };
}
