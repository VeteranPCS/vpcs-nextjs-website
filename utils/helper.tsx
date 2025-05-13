export function formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    const day = String(date.getDate());
    const month = String(date.getMonth() + 1);
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
}