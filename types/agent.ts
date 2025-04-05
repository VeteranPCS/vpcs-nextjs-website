import { SanityDocument } from '@sanity/client';
import { SanityImage, BaseFormData, BaseContactFormData, MilitaryServiceInfo } from './common';

/**
 * Represents an agent document in Sanity CMS
 */
export interface AgentDocument extends SanityDocument {
  name: string;
  firstName: string;
  lastName: string;
  salesforceID: string;
  image: SanityImage;
  mainImage?: SanityImage;
  _id: string;
  _rev: string;
  _type: 'agent';
}

/**
 * Represents a real estate agent document in Sanity CMS
 */
export interface RealEstateAgentDocument extends SanityDocument {
  title: string;
  url: string;
  mainImage: SanityImage;
  publishedAt: string;
  _id: string;
  _rev: string;
  _type: 'real_state_agents';
}

/**
 * Basic form data for the "Get Listed Agents" form
 */
export interface AgentListingFormData extends BaseFormData {}

/**
 * Extended agent form data with military service info
 */
export interface AgentListingWithMilitaryFormData extends AgentListingFormData, MilitaryServiceInfo {}

/**
 * Complete agent listing form data with all fields
 */
export interface CompleteAgentListingFormData extends AgentListingWithMilitaryFormData {
  state?: string;
  city?: string;
  primaryState?: string;
  otherStates?: string;
  licenseNumber?: string;
  brokerageName?: string;
  managingBrokerName?: string;
  managingBrokerPhone?: string;
  managingBrokerEmail?: string;
  citiesServiced?: string;
  basesServiced?: string;
  personallyPCS?: string;
  leadAcceptance?: string;
  howDidYouHear?: string;
  tellusMore?: string;
  captchaToken?: string;
  captcha_settings?: string;
}

/**
 * Contact agent form data
 */
export interface ContactAgentFormData extends BaseContactFormData {
  currentBase: string;
  destinationBase: string;
  howDidYouHear: string;
  tellusMore?: string;
  state?: string;
  city?: string;
  buyingSelling?: string;
  timeframe?: string;
  typeOfHome?: string;
  bedrooms?: string;
  bathrooms?: string;
  maxPrice?: string;
  preApproval?: string;
}
