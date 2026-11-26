// Independent expected destinations and owners. Do not derive them from the routing policy under test.
const regions = /** @type {const} */ ([
    { state: 'CO', slug: 'colorado', owner: 'BETH' },
    { state: 'FL', slug: 'florida', owner: 'STEPHANIE' },
]);
const submissions = /** @type {const} */ ([
    { role: 'agent', label: 'Agent', channel: 'selected' },
    { role: 'lender', label: 'Lender', channel: 'selected' },
    { role: 'agent', label: 'Agent', channel: 'unselected' },
    { role: 'lender', label: 'Lender', channel: 'unselected' },
]);

export const routingRehearsalCases = [
    ...regions.flatMap(region => submissions.map(submission => ({
        ...region,
        ...submission,
        name: submission.label + (submission.channel === 'selected' ? 'Selected' : 'Unselected') + region.state,
    }))),
    { ...regions[0], role: 'agent', channel: 'concierge', name: 'AgentConciergeCO' },
    { ...regions[1], role: 'lender', channel: 'concierge', name: 'LenderConciergeFL' },
    { ...regions[0], role: 'agent', channel: 'spam', name: 'AgentQuarantinedCO' },
];

export const routingDeliveryCases = routingRehearsalCases.filter(scenario => scenario.channel === 'selected');

export const routingLeadFields = 'WebFormAgentId__c, WebFormLenderId__c, Agent__c, Lender__c, WebFormURL__c, ' +
    'Additional_Comments__c, VPCS_Visitor_ID__c, VPCS_Submission_ID__c';
