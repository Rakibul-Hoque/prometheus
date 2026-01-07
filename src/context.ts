import { IncomingMessage, ServerResponse } from "http";
import type { Context, Request } from "./types";
import { getMimeType } from "./mime";

async function parseRequestBody(req: IncomingMessage): Promise<any> {
    if (req.method === "GET" || req.method === "HEAD") return null;

    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    if (!chunks.length) return null;

    const raw = Buffer.concat(chunks).toString();
    const type = req.headers["content-type"] || "";

    if (type.includes("application/json")) {
        return JSON.parse(raw);
    }

    if (type.includes("application/x-www-form-urlencoded")) {
        return Object.fromEntries(new URLSearchParams(raw));
    }

    return raw;
}

export async function createContext(
    req: IncomingMessage,
    res: ServerResponse
): Promise<Context> {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    return {
        req,
        res,

        method: req.method || "GET",
        path: url.pathname,
        headers: req.headers,
        query: url.searchParams,
        params: {},

        request: {
            body: await parseRequestBody(req)
        },

        status: 200,
        body: undefined,
        responded: false,

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
            const err: any = new Error(message || "Error");
            err.status = status;
            throw err;
        }
    };
}
