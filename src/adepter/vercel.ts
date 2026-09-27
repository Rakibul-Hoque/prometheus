import type { IncomingMessage, ServerResponse } from "node:http";
import { Stream } from "node:stream";
import { App } from "../app";
import type { Context, RequestContext } from "../context/types";
import type { Err } from "../types";

export interface VercelAdapterOptions {
    basePath?: string;
    onRequest?: (req: IncomingMessage) => void | Promise<void>;
    onError?: (
        err: Err,
        req: IncomingMessage,
        res: ServerResponse
    ) => void | Promise<void>;
}

function getRequestBody(req: IncomingMessage): Buffer | null {
    if (req.method === "GET" || req.method === "HEAD") return null;

    const body = (req as IncomingMessage & { body?: unknown }).body;

    if (body === undefined || body === null) return null;
    if (Buffer.isBuffer(body)) return body;
    if (typeof body === "string") return Buffer.from(body);
    return Buffer.from(JSON.stringify(body));
}

function stripBasePath(url: string, basePath?: string): string {
    if (!basePath) return url;
    if (url.startsWith(basePath)) {
        const stripped = url.slice(basePath.length);
        return stripped.startsWith("/") ? stripped : "/" + stripped;
    }
    return url;
}

function buildRequestContext(
    req: IncomingMessage,
    options: VercelAdapterOptions
): RequestContext {
    const xfwd = req.headers["x-forwarded-for"];

    const remoteAddress =
        typeof xfwd === "string"
            ? (xfwd.split(",")[0]?.trim() ?? "")
            : Array.isArray(xfwd)
              ? (xfwd[0] ?? "")
              : (req.socket?.remoteAddress ?? "");

    const host = req.headers.host || "localhost";

    return {
        headers: req.headers as Record<string, string | string[] | undefined>,
        method: req.method || "GET",
        url: stripBasePath(req.url || "/", options.basePath),
        body: getRequestBody(req),
        remoteAddress,
        host,
        port: 0
    };
}


async function sendResponse(
    ctx: Context | undefined,
    res: ServerResponse,
    isProxy: boolean
): Promise<void> {
    if (ctx === undefined) throw new Error("Context is undefined");

    if (isProxy) return;
    if (res.writableEnded) return;

    res.statusCode = ctx.status || ctx.response.status || 200;

    for (const [key, val] of ctx.response.headers) {
        if (val !== undefined) res.setHeader(key, val as any);
    }

    if (
        ctx._execState?._redirect___ ||
        (res.statusCode >= 300 && res.statusCode < 400)
    ) {
        res.end();
        return;
    }

    const body = ctx.body;

    if (body === undefined || body === null) {
        res.end();
        return;
    }

    if (body instanceof Stream) {
        body.pipe(res);
        return;
    }

    res.end(body);
}

function handleError(
    err: Err,
    res: ServerResponse,
    options: VercelAdapterOptions,
    req: IncomingMessage
): void {
    if (options.onError) {
        void options.onError(err, req, res);
        return;
    }

    console.error("vercel adapter error", err);

    if (!res.writableEnded) {
        res.statusCode = err?.status || 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(
            JSON.stringify({
                error: err?.message || "Internal Server Error",
                status: res.statusCode
            })
        );
    }
}

export function createVercelHandler(
    app: App,
    options: VercelAdapterOptions = {}
) {
    const handler = app.handler();

    return async function vercelHandler(
        req: IncomingMessage,
        res: ServerResponse
    ): Promise<void> {
        let ctx: Context | undefined;
        try {
            if (options.onRequest) await options.onRequest(req);

            const reqCtx = buildRequestContext(req, options);
            ctx = await handler(reqCtx);

            const isProxy = !!ctx._execState?._proxy___;
            await sendResponse(ctx, res, isProxy);
        } catch (err) {
            handleError(err as Err, res, options, req);
        }
    };
}
