import type { Agent, Lenders } from '@/services/stateService';

export type DestinationType =
  | 'military_base'
  | 'city'
  | 'zip'
  | 'state'
  | 'ambiguous'
  | 'unknown';

export type RoutingConfidence = 'high' | 'medium' | 'low';

export interface RoutingState {
  code: string;
  name: string;
  slug: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ClarificationCandidate {
  name: string;
  stateName: string;
  stateCode: string;
  reason: string;
}

export interface DestinationResolution {
  input: string;
  type: DestinationType;
  normalizedName: string;
  stateName?: string;
  stateCode?: string;
  stateSlug?: string;
  latitude?: number;
  longitude?: number;
  confidence: RoutingConfidence;
  candidates?: ClarificationCandidate[];
  coverageAreaOverride?: string;
  caveat?: string;
}

export interface CoverageArea {
  areaName: string;
  slug: string;
  stateName: string;
  stateCode: string;
  stateSlug: string;
  latitude?: number;
  longitude?: number;
  agentCount: number;
  lenderAvailable: boolean;
  topAgentScore: number;
  topLenderScore: number;
  aliases: string[];
}

export interface RoutedCoverageArea extends CoverageArea {
  distanceMiles?: number;
  confidence: RoutingConfidence;
  reason: string;
  exactMatch: boolean;
}

export interface CoverageRoutingResult {
  destination: DestinationResolution;
  coverageAreas: RoutedCoverageArea[];
  selectedCoverageArea?: RoutedCoverageArea;
  needsClarification: boolean;
  caveat?: string;
}

export type PartnerRole = 'agent' | 'lender';

export interface PublicPartner {
  id: string;
  role: PartnerRole;
  name: string;
  firstName: string;
  lastName?: string;
  brokerage: string;
  city: string;
  militaryStatus: string;
  militaryService: string;
  statesLicensed?: string;
  individualNmlsId?: string;
  companyNmlsId?: string;
  photoUrl: string;
  bio: string;
  contactHref: string;
  profileHref: string;
  stateName: string;
  stateSlug: string;
  areaName?: string;
  aaScore?: number;
}

export interface PartnersForCoverageAreaResult {
  role: PartnerRole;
  stateName: string;
  stateCode: string;
  stateSlug: string;
  areaName?: string;
  matchedArea: boolean;
  partners: PublicPartner[];
  caveat?: string;
}

export type PartnerRecord = Agent | Lenders;
