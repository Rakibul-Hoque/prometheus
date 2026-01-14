import type { Context, Next } from "../types";

export async function notFound(ctx: Context) {
    if (ctx.body === undefined) {
        try {
            await ctx.currentApp.emit("notFound", ctx);
        } catch (err) {
            console.error("Error in onNotFound handler:", err);
            ctx.status = 404;
            ctx.body = {
                error: "Not Found",
                status: 404
            };
        }
        if (!ctx.type) {
            ctx.type = "json";
        }
    }
}
