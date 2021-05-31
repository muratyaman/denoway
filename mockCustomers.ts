import { httpServe } from './deps.ts';

const server = httpServe({ port: 9001 });
console.info('mock customer service ready at http://localhost:9001/');

for await (const req of server) {
  const { method, url } = req;
  const ua = req.headers.get('user-agent');
  console.info('>> request', method, url, ua);
  const body = await Deno.readAll(req.body);
  const data = { ts: new Date(), method, url, body };
  const headers = new Headers();
  headers.set('content-type', 'application/json');
  req.respond({ body: JSON.stringify(data), headers });
}
