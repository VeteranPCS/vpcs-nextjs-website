// lib/magic-link.ts
// JWT-based magic links for agent portal authentication (48h expiry)

import * as jwt from 'jsonwebtoken';

const MAGIC_LINK_SECRET = process.env.MAGIC_LINK_SECRET!;
// External-facing URL for links sent via SMS/email (must be accessible from phones)
// Falls back to NEXT_PUBLIC_API_BASE_URL, then veteranpcs.com
const BASE_URL = process.env.MAGIC_LINK_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://veteranpcs.com';

// Token expires in 48 hours
const TOKEN_EXPIRY = '48h';

export interface MagicLinkPayload {
  agent_id: string;
  deal_id: string;
  type: 'agent' | 'lender';
}

export interface ValidationResult {
  valid: boolean;
  agent_id?: string;
  deal_id?: string;
  type?: 'agent' | 'lender';
  error?: string;
}

/**
 * Generate a magic link URL for an agent/lender to update a deal
 *
 * @param agentId - The Attio record ID of the agent or lender
 * @param dealId - The Attio list entry ID of the deal
 * @param type - Whether this is for an 'agent' or 'lender'
 * @returns The full magic link URL
 */
export function generateMagicLink(
  agentId: string,
  dealId: string,
  type: 'agent' | 'lender' = 'agent'
): string {
  const payload: MagicLinkPayload = {
    agent_id: agentId,
    deal_id: dealId,
    type,
  };

  const token = jwt.sign(payload, MAGIC_LINK_SECRET, {
    expiresIn: TOKEN_EXPIRY,
    algorithm: 'HS256',
  });

  return `${BASE_URL}/portal?token=${token}`;
}

/**
 * Validate a magic link token and extract the payload
 *
 * @param token - The JWT token from the magic link URL
 * @returns ValidationResult with payload if valid, error message if not
 */
export function validateMagicLink(token: string): ValidationResult {
  try {
    const decoded = jwt.verify(token, MAGIC_LINK_SECRET, {
      algorithms: ['HS256'],
    }) as MagicLinkPayload;

    return {
      valid: true,
      agent_id: decoded.agent_id,
      deal_id: decoded.deal_id,
      type: decoded.type,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        valid: false,
        error: 'Link has expired. Please request a new link.',
      };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        valid: false,
        error: 'Invalid link. Please request a new link.',
      };
    }
    return {
      valid: false,
      error: 'Unable to validate link.',
    };
  }
}

/**
 * Extract token from URL search params
 * Utility for use in API routes
 */
export function extractToken(searchParams: URLSearchParams): string | null {
  return searchParams.get('token');
}
