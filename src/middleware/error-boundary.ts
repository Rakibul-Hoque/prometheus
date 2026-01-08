// src/error-boundary.ts
import type { Context, Next } from "../types";

export async function errorBoundary(ctx: Context, next: Next) {
    try {
        await next();
    } catch (err: any) {
        const app = ctx.app;

        try {
            await app._onError(ctx, err);
        } catch (handlerErr) {
            console.error("Error in onError handler:", handlerErr);
            ctx.body = {
                error: "Internal Server Error",
                status: 500
            };
        }

        if (!ctx.type) {
            ctx.type = "json";
        }
    }
}
