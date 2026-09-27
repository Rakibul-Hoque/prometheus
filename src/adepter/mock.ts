import { App } from "../app";
import type { Context, RequestContext } from "../context/types";

export interface MockInit {
    method?: string;
    url?: string;
    headers?: Record<string, string | (string | number)[]>;
    body?: any;
    query?: Record<string, string>;
    remoteAddress?: string;
}

export interface MockResult {
    status: number;
    headers: Record<string, string | (string | number)[]>;
    body: any;
    ctx: Context;
    request: RequestContext;
}

function buildRequestContext(init: MockInit): RequestContext {
    const method = (init.method ?? "GET").toUpperCase();
    let url = init.url ?? "/";

    if (init.query) {
        const u = new URL(url, "http://localhost");
        for (const [k, v] of Object.entries(init.query))
            u.searchParams.set(k, v);
        url = u.pathname + u.search + u.hash;
    }

    const headers: Record<string, string | (string | number)[]> = {};
    for (const [k, v] of Object.entries(init.headers ?? {})) {
        headers[k.toLowerCase()] = v;
    }

    let body: Buffer | null = null;
    if (init.body !== undefined && method !== "GET" && method !== "HEAD") {
        if (Buffer.isBuffer(init.body)) {
            body = init.body;
        } else if (typeof init.body === "string") {
            body = Buffer.from(init.body);
            if (!headers["content-type"])
                headers["content-type"] = "text/plain";
        } else if (typeof init.body === "object") {
            body = Buffer.from(JSON.stringify(init.body));
            if (!headers["content-type"])
                headers["content-type"] = "application/json";
        }
        if (body) headers["content-length"] = String(body.length);
    }

    return {
        method,
        url,
        headers: headers as any,
        body,
        remoteAddress: init.remoteAddress ?? "127.0.0.1",
        host: headers["host"] ?? "localhost",
        port: 0
    } as RequestContext;
}

function parseResult(ctx: Context, reqCtx: RequestContext): MockResult {
    const status = ctx.status || ctx.response.status || 200;

    const headers: Record<string, string> = {};
    const rawHeaders = ctx.response.headers;

    for (const [k, v] of rawHeaders) headers[k.toLowerCase()] = String(v);

    const rawBody = ctx.body;
    let body = undefined;

    if (rawBody === undefined || rawBody === null) {
    } else if (Buffer.isBuffer(rawBody)) {
        body = rawBody;
    } else if (headers["content-type"] === "application/json") {
        body = JSON.parse(rawBody);
    } else {
        body = String(rawBody);
    }

    return {
        status,
        headers,
        body,
        ctx,
        request: reqCtx
    };
}

export function createMock(app: App) {
    const handler = app.handler();

    const request = async (init: MockInit = {}): Promise<MockResult> => {
        const reqCtx = buildRequestContext(init);
        const ctx = await handler(reqCtx);
        return parseResult(ctx, reqCtx);
    };

    return {
        request,
        get: (url: string, init: MockInit = {}) =>
            request({ ...init, method: "GET", url }),
        post: (url: string, body?: any, init: MockInit = {}) =>
            request({ ...init, method: "POST", url, body }),
        put: (url: string, body?: any, init: MockInit = {}) =>
            request({ ...init, method: "PUT", url, body }),
        patch: (url: string, body?: any, init: MockInit = {}) =>
            request({ ...init, method: "PATCH", url, body }),
        delete: (url: string, init: MockInit = {}) =>
            request({ ...init, method: "DELETE", url })
    };
}
