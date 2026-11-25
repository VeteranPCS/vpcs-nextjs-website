import type { AxiosRequestHeaders, AxiosResponse } from 'axios';
import { MOCK_AGENT_ID, MOCK_LENDER_ID } from './partner-fixture-assets';

export { MOCK_AGENT_ID, MOCK_LENDER_ID } from './partner-fixture-assets';

const licensedStates = 'CO;TX;CA;VA;WA;FL';
const baseAccount = {
    IsPersonAccount: true,
    Active_on_Website__pc: true,
    FirstName: 'Sample',
    BillingAddress: { city: 'Colorado Springs', state: 'Colorado' },
    BillingCity: 'Colorado Springs',
    BillingState: 'Colorado',
    BillingStateCode: 'CO',
    State_s_Licensed_in__pc: 'CO',
    Other_States__pc: licensedStates,
    Military_Status__pc: 'Veteran',
    Military_Service__pc: 'Army',
    Area_Assignments__r: {
        records: [{
            Id: 'a01000000000001',
            Name: 'Sample Colorado Springs assignment',
            AA_Score__c: 100,
            Area__r: { Name: 'Colorado Springs', State__c: 'CO' },
        }],
    },
};

const accounts = [
    {
        ...baseAccount,
        Id: MOCK_AGENT_ID,
        AccountId_15__c: MOCK_AGENT_ID,
        Name: 'Sample Agent',
        LastName: 'Agent',
        Agent_Bio__pc: 'This fictional agent is available in the offline test environment.',
        Brokerage_Name__pc: 'Sample Realty',
        PersonEmail: 'agent@example.invalid',
        PersonMobilePhone: '+12025550101',
        isAgent__pc: true,
        isLender__pc: false,
    },
    {
        ...baseAccount,
        Id: MOCK_LENDER_ID,
        AccountId_15__c: MOCK_LENDER_ID,
        Name: 'Sample Lender',
        LastName: 'Lender',
        Agent_Bio__pc: 'This fictional lender is available in the offline test environment.',
        Brokerage_Name__pc: 'Sample Lending',
        Individual_NMLS_ID__pc: '000000',
        Company_NMLS_ID__pc: '000000',
        PersonEmail: 'lender@example.invalid',
        PersonMobilePhone: '+12025550102',
        isAgent__pc: false,
        isLender__pc: true,
    },
];

function queryAccounts(soql: string) {
    const id = /(?:\bId|\bAccountId_15__c)\s*=\s*'([a-zA-Z0-9]+)'/i.exec(soql)?.[1];
    const state = /State_s_Licensed_in__pc\s+LIKE\s+'%([A-Z]{2})%'/i.exec(soql)?.[1]?.toUpperCase();
    const firstName = /\bFirstName\s*=\s*'([^']+)'/i.exec(soql)?.[1];
    const lastName = /\bLastName\s*=\s*'([^']+)'/i.exec(soql)?.[1];
    const isAgent = /isAgent__pc\s*=\s*true/i.test(soql);
    const isLender = /isLender__pc\s*=\s*true/i.test(soql);
    return accounts.filter(account =>
        (!id || id.slice(0, 15) === account.Id)
        && (!state || licensedStates.split(';').includes(state))
        && (!firstName || account.FirstName.toLowerCase() === firstName.toLowerCase())
        && (!lastName || account.LastName.toLowerCase() === lastName.toLowerCase())
        && (!(isAgent || isLender) || (isAgent && account.isAgent__pc) || (isLender && account.isLender__pc)),
    );
}

function mockResponse(status: number, data?: unknown): AxiosResponse {
    return { status, data, statusText: '', headers: {}, config: { headers: {} as AxiosRequestHeaders } };
}

export function requestMockSalesforce(url: URL, method: string, image: boolean): AxiosResponse {
    if (image) {
        const pixel = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1T0AAAAASUVORK5CYII=',
            'base64',
        );
        return mockResponse(200, Uint8Array.from(pixel).buffer);
    }
    if (method === 'post') return mockResponse(201, { id: '00Q000000000001', success: true, errors: [] });
    if (method !== 'get') return mockResponse(204);

    const soql = url.searchParams.get('q') ?? '';
    const records = /\bFROM Account\b/i.test(soql)
        ? structuredClone(queryAccounts(soql))
        : /\bFROM Opportunity\b/i.test(soql) && /\bSUM\(/i.test(soql)
            ? [{ attributes: { type: 'AggregateResult' }, expr0: 12000, expr1: 450, expr2: 1200000 }]
            : [];
    return mockResponse(200, { totalSize: records.length, done: true, records });
}
