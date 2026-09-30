/** A single navigation owner for both customer forms; replaceable in isolated DOM tests. */
export function navigateCustomerSuccess(url: string): void {
  window.location.assign(url);
}
