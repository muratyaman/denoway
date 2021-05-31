import { httpServe, HttpServerRequest, HttpServerResponse, redisConnect, uuid } from './deps.ts';
import * as _ from './constants.ts';
import { makeConfig } from './config.ts';
import { decode } from './text.ts';
import { IHttpContext } from './types.ts';
import { CustomerService } from './services/customers.ts';

const config = makeConfig();

const customers = new CustomerService(config.services.customers);
await customers.load();

const services = [
  customers,
];

console.info('starting http server...');
const server = httpServe(config.http.connect);
console.info('starting http server... done!');

console.info('connecting to redis server...');
const redis = await redisConnect(config.redis.connect);
console.info('connecting to redis server... done!');

console.info('ping...');
const pong = await redis.ping();
console.info('ping... pong!', pong);

httpStart()
  .then(() => { console.info('http end'); })
  .catch(e => { console.error('http error', e)});

async function httpStart(): Promise<void> {
  console.log(`denoway is ready at http://localhost:${config.http.connect.port}/`);
  for await (const req of server) {
    console.info(new Date(), 'new request');
    await httpHandle(req);
  }
}

async function httpHandle(req: HttpServerRequest, t0 = new Date(), id = uuid.generate()): Promise<boolean> {
  const { method, url, contentLength = 0 } = req;
  const meta = { t0, id, ip: '', method, url, contentLength: contentLength ?? 0, body: '' };
  const res: HttpServerResponse = { body: '', status: 200, statusText: 'OK', headers: new Headers() };
  const ctx = { meta, req, res };
  await httpPipeline(ctx);
  return true;
}

async function httpPipeline(ctx: IHttpContext): Promise<boolean> {
  try {
    await httpRemoteIp(ctx);
    await httpAccessLog(ctx);
    await httpCheckAuth(ctx);
    await httpCheckRate(ctx);
    await httpRequestBody(ctx);
    await httpServices(ctx);
  } catch (err) {
    // ctx.res.status = 500; // TODO ?
    console.error('httpPipeline() error', err.message);
  }
  ctx.meta.t1 = new Date();
  await httpResponseTime(ctx);
  if (ctx.res.headers) {
    ctx.res.headers.set(_.HDR_REQUEST_ID, ctx.meta.id);
  }
  ctx.req.respond(ctx.res);
  return true;
}

async function httpRemoteIp(ctx: IHttpContext): Promise<string> {
  if (ctx.req.headers) {
    ctx.meta.ip = ctx.req.headers.get(_.HDR_REMOTE_IP) ?? ''; // let Nginx sort it out
  }
  if (ctx.meta.ip.trim() === '') {
    throw new Error('ip');
  }
  return ctx.meta.ip;
}

async function httpAccessLog(ctx: IHttpContext): Promise<boolean> {
  const msg = JSON.stringify(ctx.meta);
  console.info('httpAccessLog() redis publish ...');
  const result = await redis.publish(config.redis.channels.accessLog, msg);
  console.info('httpAccessLog() redis publish ... done!', result);
  return true;
}

async function httpCheckAuth(ctx: IHttpContext): Promise<boolean> {
  const auth      = ctx.req.headers.get(_.HDR_AUTH) ?? '';
  const apiKey    = ctx.req.headers.get(_.HDR_API_KEY) ?? '';
  const apiSecret = ctx.req.headers.get(_.HDR_API_SECRET) ?? '';
  if (auth.trim() === '' || apiKey.trim() === '' || apiSecret.trim() === '') {
    throw new Error('auth');
  }
  // TODO validate auth, api key/secret
  return true;
}

async function httpCheckRate(ctx: IHttpContext): Promise<boolean> {
  const prefix = _.CACHE_PREFIX_IP_RPM + ctx.meta.ip + '--';
  const key    = prefix + Date.now();
  await cacheSet(key, '1', config.middleware.rate.cacheExpiryMs);
  const keys = await cacheKeys(prefix + '*');
  console.info('httpCheckRate()', ctx.meta.ip, 'rpm', keys.length);
  if (config.middleware.rate.limitPerMinute < keys.length) {
    throw new Error('rate');
  }
  return true;
}

async function httpRequestBody(ctx: IHttpContext): Promise<boolean> {
  const body = await Deno.readAll(ctx.req.body);
  ctx.meta.body = decode(body);
  return true;
}

async function httpServices(ctx: IHttpContext): Promise<boolean> {
  for await (const s of services) {
    if (s.config && ctx.meta.url.startsWith(s.config.urlPath)) {
      await s.handle(ctx);
    }
  }
  return true;
}

async function httpResponseTime(ctx: IHttpContext): Promise<number> {
  let delta = 0;
  if (ctx.meta.t1 && ctx.res.headers) {
    delta = ctx.meta.t1.getTime() - ctx.meta.t0.getTime();
    ctx.res.headers.set(_.HDR_RESPONSE_TIME, String(delta));
  }
  return delta;
}

async function cacheKeys(like: string): Promise<string[]> {
  const keys = await redis.keys(like);
  return keys;
}

async function cacheSet(k: string, v: string, ex = 0): Promise<boolean> {
  const s = await redis.set(k, v, ex ? { ex } : {});
  return !!s;
}

async function cacheGet(k: string): Promise<string> {
  const s = await redis.get(k);
  return String(s);
}
