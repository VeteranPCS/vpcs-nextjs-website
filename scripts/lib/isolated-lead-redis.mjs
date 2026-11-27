import { execFile, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

const run = promisify(execFile);
const supportedCommands = new Set(['PING', 'EVAL', 'EVALSHA', 'SCRIPT', 'GET', 'MGET', 'SET', 'PTTL', 'TTL', 'EXISTS', 'DEL']);
const redisEnvironment = { PATH: process.env.PATH, LANG: 'C' };

function encodeResult(result) {
  if (Array.isArray(result)) return result.map(encodeResult);
  return typeof result === 'string' ? Buffer.from(result).toString('base64') : result;
}

/** Start a throwaway Redis server and a loopback-only Upstash protocol adapter. */
export async function startIsolatedLeadRedis() {
  // Keep the socket path short enough for macOS Unix sockets. mkdtemp is private.
  const directory = await mkdtemp('/tmp/vpcs-lead-redis-');
  const socket = join(directory, 'redis.sock');
  const token = randomBytes(24).toString('hex');
  const redis = spawn('redis-server', [
    '--port', '0', '--unixsocket', socket, '--unixsocketperm', '700',
    '--dir', directory, '--save', '', '--appendonly', 'no',
  ], { stdio: 'ignore', env: redisEnvironment });
  const stopped = new Promise(resolve => {
    redis.once('exit', resolve);
    redis.once('error', resolve);
  });
  const command = async (args, encode = false) => {
    if (!Array.isArray(args) || !supportedCommands.has(String(args[0]).toUpperCase()) ||
        !args.every(arg => typeof arg === 'string' || typeof arg === 'number')) {
      return { error: 'Unsupported isolated Redis command' };
    }
    try {
      const { stdout } = await run('redis-cli', ['-s', socket, '--json', ...args.map(String)], {
        timeout: 2_000, env: redisEnvironment,
      });
      if (stdout.startsWith('error:')) return { error: stdout.slice(6).trim() };
      const result = JSON.parse(stdout);
      return { result: encode ? encodeResult(result) : result };
    } catch {
      return { error: 'Isolated Redis unavailable' };
    }
  };
  const adapter = createServer(async (request, response) => {
    const json = (status, body) => {
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(body));
    };
    if (request.headers.authorization !== `Bearer ${token}`) return json(401, { error: 'Unauthorized' });
    if (request.method !== 'POST' || !['/', '/pipeline'].includes(request.url)) {
      return json(404, { error: 'Unsupported isolated Redis endpoint' });
    }
    try {
      let body = '';
      for await (const chunk of request) {
        body += chunk;
        if (body.length > 64_000) return json(413, { error: 'Request too large' });
      }
      const args = JSON.parse(body);
      const encode = request.headers['upstash-encoding'] === 'base64';
      if (request.url === '/') return json(200, await command(args, encode));
      const results = [];
      for (const entry of args) results.push(await command(entry, encode));
      return json(200, results);
    } catch {
      return json(400, { error: 'Invalid isolated Redis request' });
    }
  });
  const stopRedis = async () => {
    if (redis.pid && redis.exitCode === null && redis.signalCode === null) redis.kill('SIGTERM');
    await stopped;
  };
  const close = async () => {
    if (adapter.listening) await new Promise(resolve => adapter.close(resolve));
    await stopRedis();
    await rm(directory, { recursive: true, force: true });
  };
  try {
    for (let poll = 0; poll < 25; poll++) {
      if ((await command(['PING'])).result === 'PONG') {
        adapter.listen(0, '127.0.0.1');
        await once(adapter, 'listening');
        return { url: `http://127.0.0.1:${adapter.address().port}`, token, stopRedis, close };
      }
      if (!redis.pid || redis.exitCode !== null) break;
      await delay(40);
    }
    throw new Error('Isolated Redis did not start. Install redis-server and redis-cli to run this test.');
  } catch (error) {
    await close();
    throw error;
  }
}
