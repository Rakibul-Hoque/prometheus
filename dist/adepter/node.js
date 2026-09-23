"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNodeServer = createNodeServer;
const http_1 = __importDefault(require("http"));
const stream_1 = require("stream");
async function parseRequestBody(req) {
    if (req.method === "GET" || req.method === "HEAD")
        return null;
    const chunks = [];
    for await (const chunk of req)
        chunks.push(chunk);
    if (!chunks.length)
        return null;
    return Buffer.concat(chunks);
}
async function createRequestContext(req) {
    const xfwd = req.headers["x-forwarded-for"];
    const remoteAddress = xfwd && typeof xfwd === "string"
        ? xfwd.split(",")[0].trim()
        : req.socket.remoteAddress || "";
    const host = req.headers.host || "localhost";
    return {
        headers: req.headers,
        method: req.method || "GET",
        url: req.url || "/",
        body: await parseRequestBody(req),
        remoteAddress,
        host,
        port: req.socket.remotePort || 0
    };
}
async function respond(ctx, res) {
    if (res.writableEnded)
        return;
    res.statusCode = ctx.status || ctx.response.status || 200;
    const headers = ctx.response.headers;
    for (const [key, val] of headers) {
        if (val !== undefined)
            res.setHeader(key, val);
    }
    if (ctx._execState?._proxy___)
        return;
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
    if (body instanceof stream_1.Stream) {
        body.pipe(res);
        return;
    }
    res.end(body);
}
function createNodeServer(app, port, callback) {
    const handler = app.handler();
    const server = http_1.default.createServer(async (req, res) => {
        let ctx;
        try {
            const reqCtx = await createRequestContext(req);
            ctx = await handler(reqCtx);
            await respond(ctx, res);
        }
        catch (err) {
            console.error("adapter error", err);
            if (!res.writableEnded) {
                res.statusCode = err.status || 500;
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                res.end(JSON.stringify({
                    error: err.message || "Internal Server Error",
                    status: res.statusCode
                }));
            }
            throw err;
        }
    });
    server.listen(port, callback);
    return server;
}
