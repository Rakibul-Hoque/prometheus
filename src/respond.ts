import type { Context } from "./types";
import { Stream } from "stream";

export async function respond(ctx: Context) {
    if (ctx.responded) ctx.end();

    const res = ctx.res;
    const body = ctx.body;

    if (body === undefined || body === null) {
        res.end();
        return;
    }

    if (body._redirect || (ctx.status >= 300 && ctx.status < 400)) {
        res.end();
        return;
    }

    if (body instanceof Stream) {
        body.pipe(res);
        return;
    }

    if (Buffer.isBuffer(body)) {
        res.end(body);
        return;
    }

    if (typeof body === "object") {
        if (!res.getHeader("Content-Type")) {
            res.setHeader("Content-Type", "application/json");
        }
        res.end(JSON.stringify(body));
        return;
    }

    if (!res.getHeader("Content-Type")) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
    }

    res.end(String(body));
}
