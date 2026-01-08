import type { Context, Next } from "../types";

export async function notFound(ctx: Context) {
    if (ctx.body === undefined) {
        const app = ctx.app;
        try {
            await app._onNotFound(ctx);
        } catch (err) {
            console.error("Error in onNotFound handler:", err);
            ctx.status = 404;
            ctx.body = {
                error: "Not Found",
                status: 404
            };
        }

        if (!ctx.type) {
            ctx.type = "application/json";
        }
    }
}
