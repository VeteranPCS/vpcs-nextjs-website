/** Authentication failures must not be retried as REST transport failures. */
export class SalesforceTokenError extends Error {
  constructor() {
    super('Failed to FETCH Salesforce Token');
    this.name = 'SalesforceTokenError';
  }
}
