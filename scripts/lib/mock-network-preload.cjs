// Next uses loopback connections between its development processes. Mock mode
// permits those while refusing external requests even if a call site regresses.
const { Socket } = require('node:net');

const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
const connect = Socket.prototype.connect;

Socket.prototype.connect = function (...args) {
    const [address, host] = Array.isArray(args[0]) ? args[0] : args;
    const hostname = typeof address === 'object' && address !== null ? address.host : host;
    if (typeof hostname === 'string' && !loopbackHosts.has(hostname)) {
        throw new Error('External network connections are disabled in mock mode.');
    }
    return Reflect.apply(connect, this, args);
};
