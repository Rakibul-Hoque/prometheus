import type { Context } from "./types";
import { Stream } from "stream";

export function respond(ctx: Context) {
    if (ctx.responded) return;
    ctx.responded = true;

    const res = ctx.res;
    const body = ctx.body;

    res.statusCode = ctx.status || 200;

    if (body === undefined || body === null) {
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
