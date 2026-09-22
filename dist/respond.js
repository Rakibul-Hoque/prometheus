"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.respond = respond;
const stream_1 = require("stream");
async function respond(ctx) {
    if (ctx._execState._proxy___)
        return;
    const res = ctx.res;
    const body = ctx.body;
    if (ctx._execState._redirect___ ||
        (ctx.status >= 300 && ctx.status < 400)) {
        res.end();
        return;
    }
    if (body === undefined || body === null) {
        res.end();
        return;
    }
    if (body instanceof stream_1.Stream) {
        body.pipe(res);
        return;
    }
    if (Buffer.isBuffer(body)) {
        res.end(body);
        return;
    }
    if (typeof body === "object") {
        if (!res.getHeader("Content-Type")) {
            res.setHeader("Content-Type", "application/json");
        }
        res.end(JSON.stringify(body));
        return;
    }
    if (!res.getHeader("Content-Type")) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
    }
    res.end(String(body));
}
