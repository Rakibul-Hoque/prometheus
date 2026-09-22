import { App } from "../app";
import type { Context, RequestContext } from "../context/types";
import { Stream } from "stream";

export interface VercelAdapterOptions {
    basePath?: string;
    onRequest?: (req) => void | Promise<void>;
    onError?: (err: any, req, res) => void;
}

function getRequestBody(req): Buffer | null {
    if (req.method === "GET" || req.method === "HEAD") return null;
    const body = (req as any).body;
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
    req,
    options: VercelAdapterOptions
): RequestContext {
    const xfwd = req.headers["x-forwarded-for"];
    const remoteAddress =
        typeof xfwd === "string"
            ? xfwd.split(",")[0].trim()
            : Array.isArray(xfwd)
              ? xfwd[0]
              : (req.socket as any)?.remoteAddress || "";

    const host = req.headers.host || "localhost";

    return {
        headers: req.headers as any,
        method: req.method || "GET",
        url: stripBasePath(req.url || "/", options.basePath),
        body: getRequestBody(req),
        remoteAddress,
        host,
        port: 0
    };
}

async function sendResponse(
    ctx: Context,
    res,
    isProxy: boolean
): Promise<void> {
    if (res.writableEnded) return;

    res.statusCode = ctx.status || ctx.response.status || 200;

    for (const [key, val] of ctx.response.headers) {
        if (val !== undefined) res.setHeader(key, val as any);
    }

    if (isProxy) return;

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
        body.pipe(res as any);
        return;
    }

    res.end(body);
}

export function createVercelHandler(
    app: App,
    options: VercelAdapterOptions = {}
) {
    const handler = app.handler();

    return async function vercelHandler(req, res): Promise<void> {
        let ctx: Context | undefined;
        try {
            if (options.onRequest) await options.onRequest(req);

            const reqCtx = buildRequestContext(req, options);
            ctx = await handler(reqCtx);

            const isProxy = !!ctx._execState?._proxy___;
            await sendResponse(ctx, res, isProxy);
        } catch (err: any) {
            if (options.onError) {
                options.onError(err, req, res);
                return;
            }
            console.error("vercel adapter error", err);
            if (!res.writableEnded) {
                res.statusCode = err?.status || 500;
                res.setHeader(
                    "Content-Type",
                    "application/json; charset=utf-8"
                );
                res.end(
                    JSON.stringify({
                        error: err?.message || "Internal Server Error",
                        status: res.statusCode
                    })
                );
            }
        }
    };
}
