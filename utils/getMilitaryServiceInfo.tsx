const orderMilitaryServiceInfo = (status: string, service: string) => {
    const first = ["Active", "Retired"].includes(status) ? status : service;
    const second = first === status ? service : status;
    return `${first} ${second}`;
};

export default orderMilitaryServiceInfo;