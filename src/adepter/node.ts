import http, { IncomingMessage, ServerResponse } from "http";
import { App } from "../app";
import type { Context, RequestContext } from "../context/types";
import { Stream } from "stream";

async function parseRequestBody(req: IncomingMessage): Promise<Buffer | null> {
    if (req.method === "GET" || req.method === "HEAD") return null;
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    if (!chunks.length) return null;
    return Buffer.concat(chunks);
}

async function createRequestContext(
    req: IncomingMessage
): Promise<RequestContext> {
    const xfwd = req.headers["x-forwarded-for"];
    const remoteAddress =
      xfwd &&  typeof xfwd === "string"
            ? xfwd.split(",")[0].trim()
            : req.socket.remoteAddress || "";

    const host = req.headers.host || "localhost";

    return {
        headers: req.headers as any,
        method: req.method || "GET",
        url: req.url || "/",
        body: await parseRequestBody(req),
        remoteAddress,
        host,
        port: req.socket.remotePort || 0
    };
}

async function respond(ctx: Context, res: ServerResponse) {
    if (res.writableEnded) return;

    res.statusCode = ctx.status || ctx.response.status || 200;

    const headers = ctx.response.headers;

    for (const [key, val] of headers) {
        if (val !== undefined) res.setHeader(key, val as any);
    }

    if (ctx._execState?._proxy___) return;

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

export function createNodeServer(
    app: App,
    port: number,
    callback?: () => void
) {
    const handler = app.handler();
    const server = http.createServer(
        async (req: IncomingMessage, res: ServerResponse) => {
            let ctx: Context | undefined;
            try {
                const reqCtx = await createRequestContext(req);
                ctx = await handler(reqCtx);
                await respond(ctx, res);
            } catch (err: any) {
                console.error("adapter error", err);
                if (!res.writableEnded) {
                    res.statusCode = err.status || 500;
                    res.setHeader(
                        "Content-Type",
                        "application/json; charset=utf-8"
                    );
                    res.end(
                        JSON.stringify({
                            error: err.message || "Internal Server Error",
                            status: res.statusCode
                        })
                    );
                }
                throw err;
            }
        }
    );
    server.listen(port, callback);
    return server;
}
