import { HttpServerRequest, HttpServerResponse } from './deps.ts';

export interface IConfig {
  http: {
    connect: {
      port: number;
    };
  };
  redis: {
    connect: {
      hostname: string;
      port: number;
    };
    channels: {
      accessLog: string;
    };
  };
  middleware: {
    auth: {
      requireAuth: boolean;
      requireApiKey: boolean;
      requireApiSecret: boolean;
    },
    rate: {
      cacheExpiryMs: number;
      limitPerMinute: number;
    },
  };
  services: {
    customers: IConfigService,
  };
}

export interface IConfigService {
  urlPath: string;
  targetServer: string;
}

export interface IService {
  config?: IConfigService;
  load(config: IConfigService): Promise<void>;
  handle(ctx: IHttpContext): Promise<void>;
}

export interface IHttpContext {
  meta: IHttpContextMeta;
  req: HttpServerRequest;
  res: HttpServerResponse;
}

export interface IHttpContextMeta extends Record<string, unknown> {
  id: string;
  t0: Date;
  t1?: Date;
  ip: string;
  method: string;
  url: string;
  contentLength: number;
  body: string;
}
