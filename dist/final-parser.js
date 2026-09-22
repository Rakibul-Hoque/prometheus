"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalParser = finalParser;
const stream_1 = require("stream");
async function finalParser(ctx) {
    if (Buffer.isBuffer(ctx.body) || ctx.body instanceof stream_1.Stream) {
    }
    else if (typeof ctx.body === "object") {
        if (!ctx.response.get("Content-Type")) {
            ctx.response.set("Content-Type", "application/json");
        }
        ctx.body = JSON.stringify(ctx.body);
    }
    else if (!ctx.response.get("Content-Type")) {
        ctx.response.set("Content-Type", "text/plain; charset=utf-8");
        ctx.body = String(ctx.body);
    }
}
