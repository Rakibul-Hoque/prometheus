"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timing = timing;
async function timing(ctx, next) {
    const start = process.hrtime.bigint();
    await next();
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1e6;
    ctx.set("X-Response-Time", ms.toFixed(2) + "ms");
}
