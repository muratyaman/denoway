import { IConfigService, IHttpContext, IService } from '../types.ts';

export class CustomerService implements IService {
  
  constructor(public config: IConfigService) {
    // do nothing
  }

  async load(): Promise<void> {
    // do something
  }

  async handle(ctx: IHttpContext): Promise<void> {
    if (this.config) {
      const url = String(this.config.targetServer + ctx.meta.url)
        .replace(this.config.urlPath, '');
      console.info('CustomerService.handle() fetching', url);
      try {
        const res = await fetch(url, { method: ctx.meta.method }); // TODO copy some request headers
        const resBody = await res.text();
        ctx.res.body = resBody; // TODO send some response headers
      } catch (err) {
        console.error('CustomerService.handle() error', err.message);
        ctx.res.body = JSON.stringify({ error: err.message });
      }
    }
  }
}
