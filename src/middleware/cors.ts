// middleware/cors.ts
import type { Middleware } from "../types";

export interface CorsOptions {
    origin?: string | ((origin?: string) => string | boolean);
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
}

export function cors(options: CorsOptions = {}): Middleware {
    const {
        origin = "*",
        methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders,
        exposedHeaders,
        credentials = false,
        maxAge
    } = options;

    return async (ctx, next) => {
        const reqOrigin = ctx.headers.origin as string | undefined;

        let allowOrigin = "*";
        if (typeof origin === "function") {
            const result = origin(reqOrigin);
            if (result === false) return;
            allowOrigin = result as string;
        } else {
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

        // Handle preflight
        if (ctx.method === "OPTIONS") {
            ctx.status = 204;
            ctx.body = null;
            return;
        }

        await next();
    };
}
