export function formatDate(timestamp: string): string {
    const date = new Date(timestamp); 
    const day = String(date.getDate()).padStart(2, "0"); 
    const month = String(date.getMonth() + 1).padStart(2, "0"); 
    const year = date.getFullYear(); 

    return `${month}.${day}.${year}`;
}