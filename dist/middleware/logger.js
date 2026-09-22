"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = logger;
async function logger(ctx, next) {
    const start = Date.now();
    try {
        await next();
    }
    finally {
        const ms = Date.now() - start;
        console.log(`${ctx.method} ${ctx.path} ${ctx.status} - ${ms}ms`);
    }
}
