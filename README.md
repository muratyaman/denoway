# denoway
simple API gateway using TypeScript, Deno and Redis to be put behind Nginx

## nginx config

Configure your server as usual and handle SSL using https://letsencrypt.org/

Below is minimal reverse proxy configuration. For more info, read:

https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/


```
server {

  location / {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_pass http://127.0.01:9000;
  }
}
```

## config

See `./config.ts`. TODO: use environment settings via `.env` file.

## run

in separate terminals:

```sh
# mock customer service
./run-mock-customers.sh

# worker to process access log messages
./run-worker-access-log.sh

# gateway
./run-http-server.sh
```

## sample request

```sh
curl --location --request GET 'http://127.0.0.1:9000/customers/test/123?q=x' \
  --header 'x-real-ip: 120.0.0.1' \
  --header 'authorization: abc' \
  --header 'x-api-key: key' \
  --header 'x-api-secret: secret'
```

## features

**Rate Limiting** per IP address per minute. Below is a very simple and powerful solution using Redis cache:

* create cache entries which expire 1 minute later, using a special prefix: `ip-rpm-[IP-Adress]--[timestamp]`
* search for keys that start with `ip-rpm-[IP-Adress]--*`; length gives us the number of requests per IP address per minute

```typescript
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
```

**Require Auth headers** like `authorization`, `x-api-key` and `x-api-secret`
(TODO: implement validation)

**Access log** management using a separate worker process using Redis Pub/Sub.
(TODO: saves messages)

**Response time** a rough calculation done for delta between start and end timestamps in ms; response header `x-response-time` is set.

**Request ID** a UUID is generated for every request; response header `x-request-id` is set.

**In-memory Cache** to speed up some operations.
(TODO: use it)

**Services** attached using URL path prefixes e.g. CustomerService middleware responds to `/customers*`
(TODO: implement proper HTTP reverse proxy). See folder services and add more services.

