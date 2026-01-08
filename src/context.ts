import { IncomingMessage, ServerResponse } from "http";
import type { Context, Request } from "./types";
import { getMimeType } from "./mime";
import { searchParamsToObject, parseRequestBody } from "./utils";

export async function createContext(
    req: IncomingMessage,
    res: ServerResponse
): Promise<Context> {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    res.statusCode = 200;
    return {
        req,
        res,

        method: req.method || "GET",
        path: url.pathname,
        headers: req.headers,
        query: searchParamsToObject(url.searchParams),
        params: {},

        request: {
            body: await parseRequestBody(req)
        },

        body: undefined,
        responded: false,
        get status() {
            return this.res.statusCode;
        },
        set status(value: number) {
            this.res.statusCode = value;
        },

        get type() {
            return this.res.getHeader("Content-Type") as string;
        },

        set type(value: string) {
            const mime = getMimeType(value) || value;
            this.set("Content-Type", mime);
        },

        redirect(url: string, status = 302) {
            this.status = status;
            this.set("Location", url);
            this.body = null;
        },
        set(name, value) {
            res.setHeader(name, value);
        },

        throw(status, message) {
            const err: any = new Error(
                message || http.STATUS_CODES[status] || "Error"
            );
            err.status = status;
            err.expose = status < 500;
            throw err;
        },
        assert(condition, message, status = 400) {
            if (!condition) {
                this.throw(status, message);
            }
        }
    };
}
