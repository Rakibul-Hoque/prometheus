import type { Context } from "./types";
import { Stream } from "stream";

export async function finalParser(ctx: Context) {
    if (Buffer.isBuffer(ctx.body) || ctx. body instanceof Stream) {
    } else if (typeof ctx.body === "object") {
        if (!ctx.response.get("Content-Type")) {
            ctx.response.set("Content-Type", "application/json");
        }
        ctx.body = JSON.stringify(ctx.body);
    } else if (!ctx.response.get("Content-Type")) {
        ctx.response.set("Content-Type", "text/plain; charset=utf-8");
        ctx.body = String(ctx.body);
    }
}
