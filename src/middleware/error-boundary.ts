// src/error-boundary.ts
import type { Context, Next } from "../types";

export async function errorBoundary(ctx: Context, next: Next) {
    try {
        await next();
    } catch (err: any) {
        ctx.status = err.status || 500;
        const app = err.app ?? ctx.currentApp;

        try {
            await app.emit("error", ctx, err);
        } catch (handlerErr) {
            console.error("Error in on error handler:", handlerErr);
            ctx.status = 500;
            ctx.body = {
                error: "Internal Server Error"
            };
            return;
        }

        if (ctx.body === undefined) {
            ctx.body = err.expose
                ? { error: err.message }
                : { error: "Internal Server Error" };
        }

        if (!ctx.type) {
            ctx.type = "json";
        }
    }
}
