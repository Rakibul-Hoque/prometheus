"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cors = cors;
function cors(options = {}) {
    const { origin = "*", methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], allowedHeaders, exposedHeaders, credentials = false, maxAge } = options;
    return async (ctx, next) => {
        const reqOrigin = ctx.headers.origin;
        let allowOrigin = "*";
        if (typeof origin === "function") {
            const result = origin(reqOrigin);
            if (result === false)
                return;
            allowOrigin = result;
        }
        else {
            allowOrigin = origin;
        }
        ctx.set("Access-Control-Allow-Origin", allowOrigin);
        ctx.set("Access-Control-Allow-Methods", methods.join(","));
        if (allowedHeaders) {
            ctx.set("Access-Control-Allow-Headers", allowedHeaders.join(","));
        }
        if (exposedHeaders) {
            ctx.set("Access-Control-Expose-Headers", exposedHeaders.join(","));
        }
        if (credentials) {
            ctx.set("Access-Control-Allow-Credentials", "true");
        }
        if (maxAge) {
            ctx.set("Access-Control-Max-Age", String(maxAge));
        }
        if (ctx.method === "OPTIONS") {
            ctx.status = 204;
            ctx.body = null;
            return;
        }
        await next();
    };
}
