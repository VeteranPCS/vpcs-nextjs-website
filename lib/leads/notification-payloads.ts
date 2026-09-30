import { formatPhoneNumberE164 } from '@/utils/formatPhoneNumber';

export interface SlackLeadInput {
  headerText: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  state?: string;
  message: string;
  agentInfo?: { name: string; email?: string; phoneNumber?: string; brokerage?: string; state?: string };
}

export function optionalContact(value?: string): string {
  return value?.trim() || 'Not provided';
}

export function displayContactPhone(value?: string): string {
  const phone = value?.trim();
  if (!phone) return 'Not provided';
  const digits = phone.replace(/\D/g, '');
  const domestic = digits.length === 10 ? digits : digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : null;
  return domestic ? `(${domestic.slice(0, 3)}) ${domestic.slice(3, 6)}-${domestic.slice(6)}` : phone;
}

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const excerpt = (text: string, max: number) => {
  if (text.length <= max) return text;
  const suffix = '… See Salesforce for full details.';
  const prefix = text.slice(0, max - suffix.length).replace(/&[^;]*$/, '').replace(/[\uD800-\uDBFF]$/, '');
  return prefix + suffix;
};
const field = (label: string, value: string) => ({ type: 'mrkdwn', text: excerpt(`*${label}:*\n${value}`, 2000) });
const phoneLink = (phone?: string) => phone?.trim()
  ? `<tel:${escape(formatPhoneNumberE164(phone.trim()))}|${escape(displayContactPhone(phone))}>`
  : 'Not provided';

/** Slack bounds apply to escaped wire text. Salesforce retains the complete content. */
export function buildSlackLeadPayload(input: SlackLeadInput, submittedAt = new Date()) {
  const fields = [field('Name', escape(input.name)), field('Email', escape(optionalContact(input.email))), field('Phone Number', phoneLink(input.phoneNumber))];
  if (input.state) fields.push(field('Destination State', escape(input.state)));
  const blocks: Array<Record<string, unknown>> = [
    { type: 'header', text: { type: 'plain_text', text: input.headerText.slice(0, 150), emoji: true } },
    { type: 'section', fields },
  ];
  if (input.message) blocks.push({ type: 'section', text: { type: 'mrkdwn', text: excerpt(`*Message:*\n${escape(input.message)}`, 3000) } });
  if (input.agentInfo) {
    const agent = input.agentInfo;
    const agentFields = [field('Agent Name', escape(agent.name || '')), field('Agent Email', escape(optionalContact(agent.email))), field('Agent Phone', phoneLink(agent.phoneNumber))];
    if (agent.brokerage) agentFields.push(field('Agent Brokerage', escape(agent.brokerage)));
    if (agent.state) agentFields.push(field('State', escape(agent.state.charAt(0).toUpperCase() + agent.state.slice(1))));
    blocks.push({ type: 'section', fields: agentFields });
  }
  blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `Submitted: ${submittedAt.toLocaleString()}` }] });
  return { blocks };
}

export function buildPartnerSmsContent(formData: Record<string, string | undefined>, stateLabel: string): string {
  return `New Lead From VeteranPCS:
${formData.firstName || ''} ${formData.lastName || ''}
Email: ${optionalContact(formData.email)}
Phone: ${displayContactPhone(formData.phone)}
Destination State: ${stateLabel}
${formData.currentBase ? `Current Base: ${formData.currentBase}` : ''}
${formData.destinationBase ? `Destination Base: ${formData.destinationBase}` : ''}
${formData.additionalComments ? `Additional Comments: ${formData.additionalComments}` : ''}`;
}
