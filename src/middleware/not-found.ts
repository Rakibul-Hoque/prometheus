import type { Context, Next } from "../types";

export async function notFound(ctx: Context) {
    if (!ctx._execState._isRouteFound___ &&!ctx._execState._proxy___&& !ctx.responded) {
        try {
            await ctx.rootApp.emit("notFound", ctx);
        } catch (err) {
            console.error("Error in onNotFound handler:", err);
        }
        if (!ctx.responded)
            ctx.send({ error: "Not Found", status: 404 }, 404, "json");
    }
}
