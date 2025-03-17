const orderMilitaryServiceInfo = (status: string, service: string) => {
    // Check if the person is both a service member and a spouse
    // Split the status field by semicolons to check for multiple statuses
    const statuses = status.split(';').map(s => s.trim());

    // Check if the person is both a service member and a spouse
    if (statuses.includes("Spouse") && statuses.some(s => ["Veteran", "Active", "Retired"].includes(s))) {
        // Find the military status (non-spouse)
        const militaryStatus = statuses.find(s => ["Veteran", "Active", "Retired"].includes(s)) || "";

        // Put service first, then military status, then spouse
        let result = `${service} ${militaryStatus}; Spouse`;

        // Handle edge cases with semicolons by ensuring there's a space after each semicolon
        result = result.replace(/;(?!\s)/g, "; ");

        return result;
    }

    // Original logic for other cases
    const first = ["Active", "Retired"].includes(status) ? status : service;
    const second = first === status ? service : status;

    // Format the combined string
    let result = `${first} ${second}`;

    // Handle edge cases with semicolons by ensuring there's a space after each semicolon
    result = result.replace(/;(?!\s)/g, "; ");

    return result;
};

export default orderMilitaryServiceInfo;