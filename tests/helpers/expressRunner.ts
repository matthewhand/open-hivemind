import type express from 'express';

type ReqInit = {
  body?: any;
  headers?: Record<string, string>;
  query?: Record<string, any>;
  ip?: string;
};

export type MockResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  text?: string;
};

function createMockReq(init: ReqInit = {}): any {
  const headers = init.headers || {};
  return {
    method: '',
    url: '',
    path: '',
    body: init.body ?? {},
    headers,
    query: init.query ?? {},
    ip: init.ip ?? '127.0.0.1',
    get: (name: string) => headers[name.toLowerCase()] || headers[name] || undefined,
  } as any;
}

function createMockRes(done: (res: MockResponse) => void): any {
  const res: MockResponse & any = {
    statusCode: 200,
    headers: {},
    body: undefined,
    text: undefined,
  };

  const api = {
    status(code: number) {
      res.statusCode = code;
      return api;
    },
    setHeader(name: string, value: string) {
      res.headers[name.toLowerCase()] = String(value);
    },
    json(payload: any) {
      res.body = payload;
      done(res);
      return api;
    },
    send(payload?: any) {
      if (typeof payload === 'string') res.text = payload;
      else res.body = payload;
      done(res);
      return api;
    },
    sendStatus(code: number) {
      res.statusCode = code;
      res.text = String(code);
      done(res);
      return api;
    },
    end(payload?: any) {
      if (payload) api.send(payload);
      else done(res);
      return api;
    },
  };

  return api as any;
}

function findRouteLayer(stack: any[], method: string, path: string): any | null {
  for (const layer of stack) {
    if (layer.route && layer.route.path === path && layer.route.methods[method]) {
      return layer;
    }
    if (layer.name === 'router' && layer.handle && Array.isArray(layer.handle.stack)) {
      const found = findRouteLayer(layer.handle.stack, method, path);
      if (found) return found;
    }
  }
  return null;
}

export async function runRoute(
  app: express.Application,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  init: ReqInit = {}
): Promise<{ req: any; res: MockResponse }> {
  const req = createMockReq(init);
  req.method = method.toUpperCase();
  req.url = path;
  req.path = path;

  const routeLayer = findRouteLayer((app as any)._router?.stack || [], method, path);
  if (!routeLayer) {
    throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  }

  const handlers = routeLayer.route.stack.map((l: any) => l.handle);

  return new Promise((resolve, reject) => {
    const res = createMockRes((finalRes) => resolve({ req, res: finalRes }));

    let idx = 0;
    const next = (err?: any) => {
      if (err) return reject(err);
      const handler = handlers[idx++];
      if (!handler) return (res as any).end();
      try {
        const ret = handler(req, res, next);
        if (ret && typeof ret.then === 'function') {
          ret.catch(reject);
        }
      } catch (e) {
        reject(e);
      }
    };

    next();
  });
}

