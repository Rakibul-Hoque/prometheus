// src/error-boundary.ts
import type { Context, Next } from "../types";

export async function errorBoundary(ctx: Context, next: Next) {
    try {
        await next();
    } catch (err: any) {
        ctx.status = err.status || 500;
        ctx.body = {
            error: err.message || "Internal Server Error"
        };
    }
}
