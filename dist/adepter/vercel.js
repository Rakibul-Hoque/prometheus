"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVercelHandler = createVercelHandler;
const node_stream_1 = require("node:stream");
function getRequestBody(req) {
    if (req.method === "GET" || req.method === "HEAD")
        return null;
    const body = req.body;
    if (body === undefined || body === null)
        return null;
    if (Buffer.isBuffer(body))
        return body;
    if (typeof body === "string")
        return Buffer.from(body);
    return Buffer.from(JSON.stringify(body));
}
function stripBasePath(url, basePath) {
    if (!basePath)
        return url;
    if (url.startsWith(basePath)) {
        const stripped = url.slice(basePath.length);
        return stripped.startsWith("/") ? stripped : "/" + stripped;
    }
    return url;
}
function buildRequestContext(req, options) {
    const xfwd = req.headers["x-forwarded-for"];
    const remoteAddress = typeof xfwd === "string"
        ? (xfwd.split(",")[0]?.trim() ?? "")
        : Array.isArray(xfwd)
            ? (xfwd[0] ?? "")
            : (req.socket?.remoteAddress ?? "");
    const host = req.headers.host || "localhost";
    return {
        headers: req.headers,
        method: req.method || "GET",
        url: stripBasePath(req.url || "/", options.basePath),
        body: getRequestBody(req),
        remoteAddress,
        host,
        port: 0
    };
}
async function sendResponse(ctx, res, isProxy) {
    if (ctx === undefined)
        throw new Error("Context is undefined");
    if (isProxy)
        return;
    if (res.writableEnded)
        return;
    res.statusCode = ctx.status || ctx.response.status || 200;
    for (const [key, val] of ctx.response.headers) {
        if (val !== undefined)
            res.setHeader(key, val);
    }
    if (ctx._execState?._redirect___ ||
        (res.statusCode >= 300 && res.statusCode < 400)) {
        res.end();
        return;
    }
    const body = ctx.body;
    if (body === undefined || body === null) {
        res.end();
        return;
    }
    if (body instanceof node_stream_1.Stream) {
        body.pipe(res);
        return;
    }
    res.end(body);
}
function handleError(err, res, options, req) {
    if (options.onError) {
        void options.onError(err, req, res);
        return;
    }
    console.error("vercel adapter error", err);
    if (!res.writableEnded) {
        res.statusCode = err?.status || 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({
            error: err?.message || "Internal Server Error",
            status: res.statusCode
        }));
    }
}
function createVercelHandler(app, options = {}) {
    const handler = app.handler();
    return async function vercelHandler(req, res) {
        let ctx;
        try {
            if (options.onRequest)
                await options.onRequest(req);
            const reqCtx = buildRequestContext(req, options);
            ctx = await handler(reqCtx);
            const isProxy = !!ctx._execState?._proxy___;
            await sendResponse(ctx, res, isProxy);
        }
        catch (err) {
            handleError(err, res, options, req);
        }
    };
}
