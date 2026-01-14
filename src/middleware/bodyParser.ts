import type { Middleware } from "../types";
import querystring from "querystring";

export const bodyParser: Middleware = async (ctx, next) => {
    const raw = ctx.request.body;

    if (raw == null || (typeof raw !== "string" && !Buffer.isBuffer(raw))) {
        return next();
    }

    const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : raw;
    const contentType = ctx.get("content-type")?.split(";")[0];

    try {
        switch (contentType) {
            case "application/json":
                ctx.request.body= text.length ? JSON.parse(text) : {};
                break;

            case "application/x-www-form-urlencoded":
            ctx.request.body = querystring.parse(text);
                break;

            case "text/plain":
                ctx.request.body = text;
                break;

            default:
                ctx.request.body = text;
        }
    } catch {
        ctx.throw(400, "Invalid request body");
    }

    await next();
};
