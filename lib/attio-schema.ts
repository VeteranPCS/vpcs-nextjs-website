// lib/attio-schema.ts
// Type definitions for Attio schema creation API

export type AttioAttributeType =
  | "text"
  | "number"
  | "checkbox"
  | "currency"
  | "date"
  | "timestamp"
  | "rating"
  | "status"
  | "select"
  | "record-reference"
  | "actor-reference"
  | "location"
  | "domain"
  // Note: email-address type not yet supported by Attio API, use 'text' instead
  | "phone-number";

export interface SelectOption {
  title: string;
  is_archived?: boolean;
}

export interface AttributeConfig {
  currency?: {
    default_currency_code: string;
    display_type: "code" | "name" | "narrowSymbol" | "symbol";
  };
  record_reference?: { allowed_objects: string[] };
  select?: { options: SelectOption[] };
}

export interface AttributeDefinition {
  title: string;
  api_slug: string;
  type: AttioAttributeType;
  description?: string;
  is_required?: boolean;
  is_unique?: boolean;
  is_multiselect?: boolean;
  config?: AttributeConfig;
}

export interface ObjectDefinition {
  api_slug: string;
  singular_noun: string;
  plural_noun: string;
}

export interface ListDefinition {
  name: string;
  api_slug: string;
  parent_object: string;
}

export interface StatusDefinition {
  title: string;
  is_active: boolean;
  target_time_in_status?: number | null;
  celebration_enabled?: boolean;
}

// Military service options (shared across objects)
export const MILITARY_SERVICE_OPTIONS: SelectOption[] = [
  { title: "Army" },
  { title: "Navy" },
  { title: "Air Force" },
  { title: "Marines" },
  { title: "Coast Guard" },
  { title: "Space Force" },
];

// Military status options (shared across objects)
export const MILITARY_STATUS_OPTIONS: SelectOption[] = [
  { title: "Active Duty" },
  { title: "Veteran" },
  { title: "Retired" }, // 20+ years service - distinct from Veteran
  { title: "Reserves" },
  { title: "National Guard" },
  { title: "Spouse" },
];

// Lifecycle stage options for agents/lenders
export const LIFECYCLE_STAGE_OPTIONS: SelectOption[] = [
  { title: "Form Submitted" },
  { title: "Interview Scheduled" },
  { title: "Interview Complete" },
  { title: "Contract Sent" },
  { title: "Contract Signed" },
  { title: "Active" },
  { title: "Suspended" },
  { title: "Churned" },
];

// Area assignment status options
export const AREA_ASSIGNMENT_STATUS_OPTIONS: SelectOption[] = [
  { title: "Active" },
  { title: "Waitlist" },
  { title: "Inactive" },
];

// Deal type options
export const DEAL_TYPE_OPTIONS: SelectOption[] = [
  { title: "Buying" },
  { title: "Selling" },
  { title: "Both" },
  { title: "Lender" },
];

// How did you hear about us options (for marketing attribution)
export const HOW_DID_YOU_HEAR_OPTIONS: SelectOption[] = [
  { title: "Google" },
  { title: "Facebook" },
  { title: "Instagram" },
  { title: "LinkedIn" },
  { title: "TikTok" },
  { title: "Base Event" },
  { title: "Transition Brief" },
  { title: "Agent Referral" },
  { title: "Friend Referral" },
  { title: "Skillbridge" },
  { title: "YouTube" },
  { title: "Other" },
];

// How did you hear options specific to internship form (includes ILE Brief)
export const INTERN_HOW_DID_YOU_HEAR_OPTIONS: SelectOption[] = [
  { title: "Google" },
  { title: "Facebook" },
  { title: "Instagram" },
  { title: "LinkedIn" },
  { title: "TikTok" },
  { title: "Base Event" },
  { title: "Transition Brief" },
  { title: "Agent Referral" },
  { title: "Friend Referral" },
  { title: "Skillbridge" },
  { title: "ILE Brief" },
  { title: "Other" },
];

// Discharge status options for interns
export const DISCHARGE_STATUS_OPTIONS: SelectOption[] = [
  { title: "Honorable Discharge" },
  { title: "Retired" },
  { title: "Medical Retirement" },
  { title: "Currently Serving" },
];

// Internship type options
export const INTERNSHIP_TYPE_OPTIONS: SelectOption[] = [
  { title: "Real Estate Agent" },
  { title: "Mortgage Lender" },
];

// Person type options (multi-select on built-in People object)
export const PERSON_TYPE_OPTIONS: SelectOption[] = [
  { title: "Agent" },
  { title: "Lender" },
  { title: "Customer" },
  { title: "Intern" },
];

// Licensed status options for interns
export const LICENSED_STATUS_OPTIONS: SelectOption[] = [
  { title: "Yes" },
  { title: "No" },
  { title: "In Progress" },
];

// US States for select options
export const US_STATE_OPTIONS: SelectOption[] = [
  { title: "Alabama" },
  { title: "Alaska" },
  { title: "Arizona" },
  { title: "Arkansas" },
  { title: "California" },
  { title: "Colorado" },
  { title: "Connecticut" },
  { title: "Delaware" },
  { title: "Washington D.C." },
  { title: "Florida" },
  { title: "Georgia" },
  { title: "Hawaii" },
  { title: "Idaho" },
  { title: "Illinois" },
  { title: "Indiana" },
  { title: "Iowa" },
  { title: "Kansas" },
  { title: "Kentucky" },
  { title: "Louisiana" },
  { title: "Maine" },
  { title: "Maryland" },
  { title: "Massachusetts" },
  { title: "Michigan" },
  { title: "Minnesota" },
  { title: "Mississippi" },
  { title: "Missouri" },
  { title: "Montana" },
  { title: "Nebraska" },
  { title: "Nevada" },
  { title: "New Hampshire" },
  { title: "New Jersey" },
  { title: "New Mexico" },
  { title: "New York" },
  { title: "North Carolina" },
  { title: "North Dakota" },
  { title: "Ohio" },
  { title: "Oklahoma" },
  { title: "Oregon" },
  { title: "Pennsylvania" },
  { title: "Puerto Rico" },
  { title: "Rhode Island" },
  { title: "South Carolina" },
  { title: "South Dakota" },
  { title: "Tennessee" },
  { title: "Texas" },
  { title: "Utah" },
  { title: "Vermont" },
  { title: "Virginia" },
  { title: "Washington" },
  { title: "West Virginia" },
  { title: "Wisconsin" },
  { title: "Wyoming" },
];

// =============================================================================
// OBJECT DEFINITIONS
// =============================================================================

export const OBJECTS: ObjectDefinition[] = [
  { api_slug: "agents", singular_noun: "Agent", plural_noun: "Agents" },
  { api_slug: "lenders", singular_noun: "Lender", plural_noun: "Lenders" },
  {
    api_slug: "customers",
    singular_noun: "Customer",
    plural_noun: "Customers",
  },
  { api_slug: "states", singular_noun: "State", plural_noun: "States" },
  { api_slug: "areas", singular_noun: "Area", plural_noun: "Areas" },
  {
    api_slug: "area_assignments",
    singular_noun: "Area Assignment",
    plural_noun: "Area Assignments",
  },
  { api_slug: "interns", singular_noun: "Intern", plural_noun: "Interns" },
];

// =============================================================================
// ATTRIBUTE DEFINITIONS BY OBJECT
// =============================================================================

export const AGENT_ATTRIBUTES: AttributeDefinition[] = [
  { title: "Salesforce ID", api_slug: "salesforce_id", type: "text" },
  {
    title: "First Name",
    api_slug: "first_name",
    type: "text",
    is_required: true,
  },
  {
    title: "Last Name",
    api_slug: "last_name",
    type: "text",
    is_required: true,
  },
  {
    title: "Email",
    api_slug: "email",
    type: "text",
    is_required: true,
    is_unique: true,
  },
  { title: "Phone", api_slug: "phone", type: "phone-number" },
  { title: "Brokerage Name", api_slug: "brokerage_name", type: "text" },
  { title: "Brokerage License", api_slug: "brokerage_license", type: "text" },
  { title: "License Number", api_slug: "license_number", type: "text" }, // Agent's personal RE license
  {
    title: "Managing Broker Name",
    api_slug: "managing_broker_name",
    type: "text",
  },
  {
    title: "Managing Broker Email",
    api_slug: "managing_broker_email",
    type: "text",
  },
  {
    title: "Managing Broker Phone",
    api_slug: "managing_broker_phone",
    type: "phone-number",
  },
  {
    title: "Military Service",
    api_slug: "military_service",
    type: "select",
    config: { select: { options: MILITARY_SERVICE_OPTIONS } },
  },
  {
    title: "Military Status",
    api_slug: "military_status",
    type: "select",
    config: { select: { options: MILITARY_STATUS_OPTIONS } },
  },
  { title: "Bio", api_slug: "bio", type: "text" },
  { title: "Headshot URL", api_slug: "headshot_url", type: "text" },
  { title: "Commission Split", api_slug: "commission_split", type: "number" },
  {
    title: "Lifecycle Stage",
    api_slug: "lifecycle_stage",
    type: "select",
    config: { select: { options: LIFECYCLE_STAGE_OPTIONS } },
  },
  {
    title: "Active on Website",
    api_slug: "active_on_website",
    type: "checkbox",
  },
  {
    title: "Person",
    api_slug: "person",
    type: "record-reference",
    description: "Linked People record for sequence enrollment",
    config: { record_reference: { allowed_objects: ["people"] } },
  },
  {
    title: "Contract Signed Date",
    api_slug: "contract_signed_date",
    type: "date",
  },
  { title: "Contract URL", api_slug: "contract_url", type: "text" },
  {
    title: "Added to Website Date",
    api_slug: "added_to_website_date",
    type: "date",
  },
];

// Lender has all agent attributes plus additional ones
export const LENDER_ADDITIONAL_ATTRIBUTES: AttributeDefinition[] = [
  { title: "Individual NMLS", api_slug: "individual_nmls", type: "text" },
  { title: "Company NMLS", api_slug: "company_nmls", type: "text" },
  { title: "Company Name", api_slug: "company_name", type: "text" },
  {
    title: "States Licensed",
    api_slug: "states_licensed",
    type: "select",
    is_multiselect: true,
    config: { select: { options: US_STATE_OPTIONS } },
  },
  {
    title: "States",
    api_slug: "states",
    type: "record-reference",
    is_multiselect: true,
    description:
      "States where this lender is assigned (reverse reference from State.lenders)",
    config: { record_reference: { allowed_objects: ["states"] } },
  },
  {
    title: "Annual Fee",
    api_slug: "annual_fee",
    type: "currency",
    config: {
      currency: { default_currency_code: "USD", display_type: "symbol" },
    },
  },
];

export const LENDER_ATTRIBUTES: AttributeDefinition[] = [
  ...AGENT_ATTRIBUTES,
  ...LENDER_ADDITIONAL_ATTRIBUTES,
];

export const CUSTOMER_ATTRIBUTES: AttributeDefinition[] = [
  { title: "Salesforce ID", api_slug: "salesforce_id", type: "text" },
  {
    title: "First Name",
    api_slug: "first_name",
    type: "text",
    is_required: true,
  },
  {
    title: "Last Name",
    api_slug: "last_name",
    type: "text",
    is_required: true,
  },
  { title: "Email", api_slug: "email", type: "text", is_required: true },
  { title: "Phone", api_slug: "phone", type: "phone-number" },
  { title: "Current Location", api_slug: "current_location", type: "text" },
  { title: "Destination City", api_slug: "destination_city", type: "text" },
  {
    title: "Military Service",
    api_slug: "military_service",
    type: "select",
    config: { select: { options: MILITARY_SERVICE_OPTIONS } },
  },
  {
    title: "Military Status",
    api_slug: "military_status",
    type: "select",
    config: { select: { options: MILITARY_STATUS_OPTIONS } },
  },
  { title: "Rank", api_slug: "rank", type: "text" },
  {
    title: "Buying Agent",
    api_slug: "buying_agent",
    type: "record-reference",
    config: { record_reference: { allowed_objects: ["agents"] } },
  },
  {
    title: "Selling Agent",
    api_slug: "selling_agent",
    type: "record-reference",
    config: { record_reference: { allowed_objects: ["agents"] } },
  },
  {
    title: "Lender",
    api_slug: "lender",
    type: "record-reference",
    config: { record_reference: { allowed_objects: ["lenders"] } },
  },
  {
    title: "Person",
    api_slug: "person",
    type: "record-reference",
    description: "Linked People record for sequence enrollment",
    config: { record_reference: { allowed_objects: ["people"] } },
  },
];

export const STATE_ATTRIBUTES: AttributeDefinition[] = [
  { title: "Name", api_slug: "name", type: "text", is_required: true },
  {
    title: "State Code",
    api_slug: "state_code",
    type: "text",
    is_required: true,
    is_unique: true,
  },
  {
    title: "State Slug",
    api_slug: "state_slug",
    type: "text",
    is_required: true,
    is_unique: true,
  },
  {
    title: "Lenders",
    api_slug: "lenders",
    type: "record-reference",
    is_multiselect: true,
    config: { record_reference: { allowed_objects: ["lenders"] } },
  },
  {
    title: "Areas",
    api_slug: "areas",
    type: "record-reference",
    is_multiselect: true,
    description: "Child areas belonging to this state (parent→child reference)",
    config: { record_reference: { allowed_objects: ["areas"] } },
  },
  { title: "Coverage Target", api_slug: "coverage_target", type: "number" },
];

export const AREA_ATTRIBUTES: AttributeDefinition[] = [
  { title: "Salesforce ID", api_slug: "salesforce_id", type: "text" },
  { title: "Name", api_slug: "name", type: "text", is_required: true },
  {
    title: "State",
    api_slug: "state",
    type: "record-reference",
    is_required: true,
    description: "Parent state (bidirectional reference)",
    config: { record_reference: { allowed_objects: ["states"] } },
  },
  {
    title: "Area Assignments",
    api_slug: "area_assignments",
    type: "record-reference",
    is_multiselect: true,
    description: "Child assignments for this area (parent→child reference)",
    config: { record_reference: { allowed_objects: ["area_assignments"] } },
  },
  { title: "Coverage Target", api_slug: "coverage_target", type: "number" },
  { title: "Coverage Active", api_slug: "coverage_active", type: "number" },
];

export const AREA_ASSIGNMENT_ATTRIBUTES: AttributeDefinition[] = [
  { title: "Salesforce ID", api_slug: "salesforce_id", type: "text" },
  {
    title: "Agent",
    api_slug: "agent",
    type: "record-reference",
    is_required: true,
    description: "The agent assigned to this area",
    config: { record_reference: { allowed_objects: ["agents"] } },
  },
  {
    title: "Area",
    api_slug: "area",
    type: "record-reference",
    is_required: true,
    description: "Parent area (bidirectional reference)",
    config: { record_reference: { allowed_objects: ["areas"] } },
  },
  {
    title: "AA Score",
    api_slug: "aa_score",
    type: "number",
    description: "Agent ranking score for this area (1-100)",
  },
  {
    title: "Status",
    api_slug: "status",
    type: "select",
    config: { select: { options: AREA_ASSIGNMENT_STATUS_OPTIONS } },
  },
];

// =============================================================================
// INTERN OBJECT ATTRIBUTES
// =============================================================================
// Interns are transitioning service members seeking placement with network
// agents/lenders for mentorship. NOT the same as agents/lenders.

export const INTERN_ATTRIBUTES: AttributeDefinition[] = [
  // Identity
  { title: "Name", api_slug: "name", type: "text", is_required: true },
  {
    title: "First Name",
    api_slug: "first_name",
    type: "text",
    is_required: true,
  },
  {
    title: "Last Name",
    api_slug: "last_name",
    type: "text",
    is_required: true,
  },
  {
    title: "Email",
    api_slug: "email",
    type: "text",
    is_required: true,
    is_unique: true,
  },
  { title: "Phone", api_slug: "phone", type: "phone-number" },

  // Military Information
  {
    title: "Military Service",
    api_slug: "military_service",
    type: "select",
    config: { select: { options: MILITARY_SERVICE_OPTIONS } },
  },
  {
    title: "Military Status",
    api_slug: "military_status",
    type: "select",
    config: { select: { options: MILITARY_STATUS_OPTIONS } },
  },
  {
    title: "Discharge Status",
    api_slug: "discharge_status",
    type: "select",
    config: { select: { options: DISCHARGE_STATUS_OPTIONS } },
  },

  // Current Location
  {
    title: "Current State",
    api_slug: "current_state",
    type: "text",
    description: "2-letter state code where applicant currently resides",
  },
  { title: "Current City", api_slug: "current_city", type: "text" },
  {
    title: "Current Base",
    api_slug: "current_base",
    type: "text",
    description: "Military base name (optional)",
  },

  // Internship Details
  {
    title: "Internship Type",
    api_slug: "internship_type",
    type: "select",
    description: "Career path: Real Estate Agent or Mortgage Lender",
    config: { select: { options: INTERNSHIP_TYPE_OPTIONS } },
  },
  {
    title: "Desired State",
    api_slug: "desired_state",
    type: "text",
    description: "2-letter state code where applicant wants to work",
  },
  {
    title: "Desired City",
    api_slug: "desired_city",
    type: "text",
    description: "City where applicant wants to work after internship",
  },
  {
    title: "Preferred Start Date",
    api_slug: "preferred_start_date",
    type: "date",
    description: "When applicant can begin internship",
  },
  {
    title: "Licensed",
    api_slug: "licensed",
    type: "select",
    description: "Current licensing status for real estate or mortgage",
    config: { select: { options: LICENSED_STATUS_OPTIONS } },
  },

  // Marketing Attribution
  {
    title: "How Did You Hear",
    api_slug: "how_did_you_hear",
    type: "select",
    config: { select: { options: INTERN_HOW_DID_YOU_HEAR_OPTIONS } },
  },
  {
    title: "How Did You Hear Other",
    api_slug: "how_did_you_hear_other",
    type: "text",
    description: "Free text when 'Other' is selected",
  },

  // Placement Tracking
  {
    title: "Mentor Agent",
    api_slug: "mentor_agent",
    type: "record-reference",
    description: "Network agent mentoring this intern",
    config: { record_reference: { allowed_objects: ["agents"] } },
  },
  {
    title: "Mentor Lender",
    api_slug: "mentor_lender",
    type: "record-reference",
    description: "Network lender mentoring this intern",
    config: { record_reference: { allowed_objects: ["lenders"] } },
  },
  {
    title: "Application Date",
    api_slug: "application_date",
    type: "date",
    description: "Date the internship application was submitted",
  },
  {
    title: "Person",
    api_slug: "person",
    type: "record-reference",
    description: "Linked People record for sequence enrollment",
    config: { record_reference: { allowed_objects: ["people"] } },
  },
];

// Map object slugs to their attributes
export const OBJECT_ATTRIBUTES: Record<string, AttributeDefinition[]> = {
  agents: AGENT_ATTRIBUTES,
  lenders: LENDER_ATTRIBUTES,
  customers: CUSTOMER_ATTRIBUTES,
  states: STATE_ATTRIBUTES,
  areas: AREA_ATTRIBUTES,
  area_assignments: AREA_ASSIGNMENT_ATTRIBUTES,
  interns: INTERN_ATTRIBUTES,
};

// =============================================================================
// PIPELINE (LIST) DEFINITIONS
// =============================================================================

export const PIPELINES: ListDefinition[] = [
  {
    name: "Agent Onboarding",
    api_slug: "agent_onboarding",
    parent_object: "agents",
  },
  {
    name: "Lender Onboarding",
    api_slug: "lender_onboarding",
    parent_object: "lenders",
  },
  {
    name: "Customer Deals",
    api_slug: "customer_deals",
    parent_object: "customers",
  },
  {
    name: "Intern Placements",
    api_slug: "intern_placements",
    parent_object: "interns",
  },
  {
    name: "Inquiries",
    api_slug: "inquiries",
    parent_object: "people",
  },
];

// Pipeline entry attributes
export const AGENT_ONBOARDING_ATTRIBUTES: AttributeDefinition[] = [
  { title: "Salesforce ID", api_slug: "salesforce_id", type: "text" },
  {
    title: "Owner",
    api_slug: "owner",
    type: "actor-reference",
    description: "Workspace member responsible for this onboarding",
  },
  {
    title: "Application Sent Date",
    api_slug: "application_sent_date",
    type: "date",
  },
  {
    title: "Application Received Date",
    api_slug: "application_received_date",
    type: "date",
  },
  {
    title: "Phone Interview Complete",
    api_slug: "phone_interview_complete",
    type: "checkbox",
  },
  {
    title: "Contract Sent At",
    api_slug: "contract_sent_at",
    type: "timestamp",
  },
  {
    title: "Contract Received At",
    api_slug: "contract_received_at",
    type: "timestamp",
  },
  {
    title: "Headshot Received Date",
    api_slug: "headshot_received_date",
    type: "date",
  },
  { title: "Bio Received", api_slug: "bio_received", type: "checkbox" },
  {
    title: "Added to Website Date",
    api_slug: "added_to_website_date",
    type: "date",
  },
  {
    title: "Internship Start Date",
    api_slug: "internship_start_date",
    type: "date",
  },
  {
    title: "Internship End Date",
    api_slug: "internship_end_date",
    type: "date",
  },
  {
    title: "Internship Location",
    api_slug: "internship_location",
    type: "text",
  },
  {
    title: "Internship Approved",
    api_slug: "internship_approved",
    type: "checkbox",
  },
  { title: "Notes", api_slug: "notes", type: "text" },
];

export const LENDER_ONBOARDING_ATTRIBUTES: AttributeDefinition[] =
  AGENT_ONBOARDING_ATTRIBUTES;

export const CUSTOMER_DEALS_ATTRIBUTES: AttributeDefinition[] = [
  { title: "Salesforce ID", api_slug: "salesforce_id", type: "text" },
  {
    title: "Owner",
    api_slug: "owner",
    type: "actor-reference",
    description: "Workspace member responsible for this deal",
  },
  {
    title: "Agent",
    api_slug: "agent",
    type: "record-reference",
    config: { record_reference: { allowed_objects: ["agents"] } },
  },
  {
    title: "Lender",
    api_slug: "lender",
    type: "record-reference",
    config: { record_reference: { allowed_objects: ["lenders"] } },
  },
  {
    title: "Area",
    api_slug: "area",
    type: "record-reference",
    config: { record_reference: { allowed_objects: ["areas"] } },
  },
  {
    title: "Deal Type",
    api_slug: "deal_type",
    type: "select",
    // Note: is_required not permitted on list attributes
    config: { select: { options: DEAL_TYPE_OPTIONS } },
  },
  {
    title: "Sale Price",
    api_slug: "sale_price",
    type: "currency",
    config: {
      currency: { default_currency_code: "USD", display_type: "symbol" },
    },
  },
  {
    title: "Agent Commission %",
    api_slug: "commission_percent",
    type: "number",
    description: "Agent commission percentage (e.g., 2.75 = 2.75%)",
  },
  {
    title: "Payout Amount",
    api_slug: "payout_amount",
    type: "currency",
    config: {
      currency: { default_currency_code: "USD", display_type: "symbol" },
    },
  },
  {
    title: "Move In Bonus",
    api_slug: "move_in_bonus",
    type: "currency",
    config: {
      currency: { default_currency_code: "USD", display_type: "symbol" },
    },
  },
  {
    title: "Charity Amount",
    api_slug: "charity_amount",
    type: "currency",
    description: "Charity donation amount based on Move-In Bonus tier",
    config: {
      currency: { default_currency_code: "USD", display_type: "symbol" },
    },
  },
  {
    title: "Deal Name",
    api_slug: "deal_name",
    type: "text",
    description: "Human-readable deal name from Salesforce",
  },
  {
    title: "Destination State",
    api_slug: "destination_state",
    type: "text",
    description: "Customer destination state",
  },
  { title: "Property Address", api_slug: "property_address", type: "text" },
  {
    title: "Expected Close Date",
    api_slug: "expected_close_date",
    type: "date",
  },
  { title: "Actual Close Date", api_slug: "actual_close_date", type: "date" },
  { title: "Last Updated", api_slug: "last_updated", type: "timestamp" },
  {
    title: "Last Stage Change",
    api_slug: "last_stage_change",
    type: "timestamp",
  },
  {
    title: "Contact Confirmed",
    api_slug: "contact_confirmed",
    type: "checkbox",
  },
  {
    title: "Contact Confirmed At",
    api_slug: "contact_confirmed_at",
    type: "timestamp",
  },
  { title: "Reroute Count", api_slug: "reroute_count", type: "number" },
  { title: "Bonus Waiver URL", api_slug: "bonus_waiver_url", type: "text" },
  { title: "Notes", api_slug: "notes", type: "text" },
  // Form submission fields (added for contact form integration)
  {
    title: "Current Location",
    api_slug: "current_location",
    type: "text",
    description: "Customer's current base/city when contacting",
  },
  {
    title: "Destination City",
    api_slug: "destination_city",
    type: "text",
    description: "Customer's destination base/city for this deal",
  },
  {
    title: "How Did You Hear",
    api_slug: "how_did_you_hear",
    type: "select",
    description: "Marketing attribution - how customer found VeteranPCS",
    config: { select: { options: HOW_DID_YOU_HEAR_OPTIONS } },
  },
  {
    title: "How Did You Hear Other",
    api_slug: "how_did_you_hear_other",
    type: "text",
    description: "Free text explanation when 'Other' is selected",
  },
];

// Intern placement pipeline attributes (minimal - most data on intern record)
export const INTERN_PLACEMENT_ATTRIBUTES: AttributeDefinition[] = [
  {
    title: "Notes",
    api_slug: "notes",
    type: "text",
    description: "Admin notes on application review and matching process",
  },
  {
    title: "Matched Date",
    api_slug: "matched_date",
    type: "date",
    description: "Date when a mentor was identified for this intern",
  },
  {
    title: "Placement Date",
    api_slug: "placement_date",
    type: "date",
    description: "Date when intern was officially placed with mentor",
  },
];

// Inquiry pipeline attributes (on People object)
export const INQUIRY_ATTRIBUTES: AttributeDefinition[] = [
  {
    title: "Message",
    api_slug: "message",
    type: "text",
    description: "The inquiry message from the contact form",
  },
  {
    title: "Source",
    api_slug: "source",
    type: "select",
    description: "Where this inquiry originated",
  },
];

export const INQUIRY_SOURCE_OPTIONS = [
  { title: "Contact Form" },
];

export const PIPELINE_ATTRIBUTES: Record<string, AttributeDefinition[]> = {
  agent_onboarding: AGENT_ONBOARDING_ATTRIBUTES,
  lender_onboarding: LENDER_ONBOARDING_ATTRIBUTES,
  customer_deals: CUSTOMER_DEALS_ATTRIBUTES,
  intern_placements: INTERN_PLACEMENT_ATTRIBUTES,
  inquiries: INQUIRY_ATTRIBUTES,
};

// =============================================================================
// PIPELINE STAGE DEFINITIONS
// =============================================================================

export const ONBOARDING_STAGES: StatusDefinition[] = [
  { title: "New Application", is_active: true },
  { title: "Interviewing", is_active: true },
  { title: "Internship", is_active: true },
  { title: "Waitlist", is_active: true },
  { title: "Contract Sent", is_active: true },
  { title: "Contract Signed", is_active: true },
  { title: "Live on Website", is_active: false, celebration_enabled: true },
  { title: "Closed Lost", is_active: false },
];

export const CUSTOMER_DEALS_STAGES: StatusDefinition[] = [
  { title: "New Lead", is_active: true },
  { title: "Tracking <1mo", is_active: true },
  { title: "Tracking 1-2mo", is_active: true },
  { title: "Tracking 3-6mo", is_active: true },
  { title: "Tracking 6+mo", is_active: true },
  { title: "Under Contract", is_active: true },
  { title: "Transaction Closed", is_active: true },
  { title: "Paid Complete", is_active: false, celebration_enabled: true },
  { title: "Closed Lost", is_active: false },
];

// Intern placement pipeline stages
export const INTERN_PLACEMENT_STAGES: StatusDefinition[] = [
  { title: "New Application", is_active: true },
  { title: "Under Review", is_active: true },
  { title: "Contacted", is_active: true },
  { title: "Matching", is_active: true },
  { title: "Matched", is_active: true },
  { title: "Placement Complete", is_active: false, celebration_enabled: true },
  { title: "Withdrawn", is_active: false },
  { title: "Unable to Place", is_active: false },
];

export const INQUIRY_STAGES: StatusDefinition[] = [
  { title: "New", is_active: true },
  { title: "Responded", is_active: true },
  { title: "Resolved", is_active: false },
];

export const PIPELINE_STAGES: Record<string, StatusDefinition[]> = {
  agent_onboarding: ONBOARDING_STAGES,
  lender_onboarding: ONBOARDING_STAGES,
  customer_deals: CUSTOMER_DEALS_STAGES,
  intern_placements: INTERN_PLACEMENT_STAGES,
  inquiries: INQUIRY_STAGES,
};
