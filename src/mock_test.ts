import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable, Writable } from "node:stream";
import { Socket } from "node:net";
import { App } from "./types";

export interface MockRequestInit {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: any;
    query?: Record<string, string>;
    cookies?: Record<string, string>;
    remoteAddress?: string;
}

export interface MockInit extends MockRequestInit {}

export interface MockResult {
    status: number;
    headers: Record<string, any>;
    body: any;
    text: string;
    raw: ServerResponse;
    request: IncomingMessage;
}

const isPlainObject = (v: any) =>
    v !== null && typeof v === "object" && !Buffer.isBuffer(v);

function createMockRequest(init: MockRequestInit = {}): IncomingMessage {
    const method = (init.method ?? "GET").toUpperCase();
    const url = init.url ?? "/";
    const headers: Record<string, string> = { ...(init.headers ?? {}) };

    // --- serialize body to a Buffer --------------------------------
    let bodyBuffer: Buffer | undefined;
    if (init.body !== undefined && method !== "GET" && method !== "HEAD") {
        if (Buffer.isBuffer(init.body)) {
            bodyBuffer = init.body;
        } else if (typeof init.body === "string") {
            bodyBuffer = Buffer.from(init.body);
            if (!headers["content-type"])
                headers["content-type"] = "text/plain";
        } else if (isPlainObject(init.body)) {
            bodyBuffer = Buffer.from(JSON.stringify(init.body));
            if (!headers["content-type"])
                headers["content-type"] = "application/json";
        } else {
            bodyBuffer = Buffer.from(String(init.body));
        }
        headers["content-length"] = String(bodyBuffer.length);
    }

    // --- create a Readable and monkey-patch IncomingMessage fields ---
    const req = new Readable({
        read() {
            if (bodyBuffer) this.push(bodyBuffer);
            this.push(null); // EOF
        }
    }) as unknown as IncomingMessage;

    // Non-stream properties
    (req as any).method = method;
    (req as any).url = url;
    (req as any).headers = headers;
    (req as any).rawHeaders = Object.entries(headers).flatMap(([k, v]) => [
        k,
        v
    ]);
    (req as any).httpVersion = "1.1";
    (req as any).httpVersionMajor = 1;
    (req as any).httpVersionMinor = 1;
    (req as any).complete = true;
    (req as any).aborted = false;
    const socket = new Socket();
    Object.defineProperty(socket, "remoteAddress", {
        value: init.remoteAddress ?? "127.0.0.1",
        writable: true,
        configurable: true,
        enumerable: true
    });
    Object.defineProperty(socket, "remotePort", {
        value: 54321,
        writable: true,
        configurable: true,
        enumerable: true
    });
    Object.defineProperty(socket, "remoteFamily", {
        value: "IPv4",
        writable: true,
        configurable: true,
        enumerable: true
    });
    Object.defineProperty(socket, "encrypted", {
        value: false,
        writable: true,
        configurable: true,
        enumerable: true
    });
    (req as any).socket = socket;
    (req as any).connection = socket;

    // --- parsed query -----------------------------------------------
    const qIndex = url.indexOf("?");
    const queryFromUrl = qIndex >= 0 ? url.slice(qIndex + 1) : "";
    const parsedQuery: Record<string, string> = {};
    new URLSearchParams(queryFromUrl).forEach((v, k) => (parsedQuery[k] = v));
    (req as any).query = { ...parsedQuery, ...(init.query ?? {}) };

    // --- cookies ----------------------------------------------------
    const cookieHeader = headers["cookie"] ?? "";
    const parsedCookies: Record<string, string> = {};
    cookieHeader.split(";").forEach(pair => {
        const [k, ...rest] = pair.trim().split("=");
        if (k) parsedCookies[k] = decodeURIComponent(rest.join("="));
    });
    (req as any).cookies = { ...parsedCookies, ...(init.cookies ?? {}) };

    return req;
}

function createMockResponse(): ServerResponse {
    const chunks: Buffer[] = [];

    const res = new Writable({
        write(chunk, _enc, cb) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            cb();
        }
    }) as unknown as ServerResponse;

    const headers: Record<string, any> = {};
    let statusCode = 200;
    let statusMessage = "OK";
    let headersSent = false;
    let ended = false;

    // helper: shadow prototype getters with plain data props
    const shadow = (name: string, value: any) => {
        Object.defineProperty(res, name, {
            value,
            writable: true,
            configurable: true,
            enumerable: true
        });
    };

    // initial values
    res.statusCode = statusCode;
    res.statusMessage = statusMessage;
    shadow("headersSent", false);
    shadow("finished", false);
    shadow("writableEnded", false);
    shadow("writableFinished", false);

    (res as any).setHeader = (name: string, value: any) => {
        headers[name.toLowerCase()] = value;
        return res;
    };
    (res as any).getHeader = (name: string) => headers[name.toLowerCase()];
    (res as any).getHeaders = () => ({ ...headers });
    (res as any).getHeaderNames = () => Object.keys(headers);
    (res as any).removeHeader = (name: string) => {
        delete headers[name.toLowerCase()];
    };
    (res as any).hasHeader = (name: string) =>
        Object.prototype.hasOwnProperty.call(headers, name.toLowerCase());

    (res as any).writeHead = (
        code: number,
        messageOrHeaders?: string | Record<string, any>,
        maybeHeaders?: Record<string, any>
    ) => {
        statusCode = code;
        res.statusCode = code;
        if (typeof messageOrHeaders === "string") {
            statusMessage = messageOrHeaders;
            res.statusMessage = messageOrHeaders;
            if (maybeHeaders) Object.assign(headers, maybeHeaders);
        } else if (messageOrHeaders) {
            Object.assign(headers, messageOrHeaders);
        }
        headersSent = true;
        shadow("headersSent", true);
        return res;
    };

    (res as any).flushHeaders = () => {
        headersSent = true;
        shadow("headersSent", true);
    };

    (res as any).write = (chunk: any) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
    };

    (res as any).end = (chunk?: any) => {
        if (ended) return res;
        ended = true;
        if (chunk !== undefined) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        headersSent = true;
        shadow("headersSent", true);
        shadow("finished", true);
        shadow("writableEnded", true);
        shadow("writableFinished", true);
        res.emit("finish");
        return res;
    };

    // test-only helpers
    (res as any)._getData = () => {
        const buf = Buffer.concat(chunks);
        const ct = String(headers["content-type"] ?? "");
        if (ct.includes("application/json")) {
            try {
                return JSON.parse(buf.toString("utf8"));
            } catch {
                return buf.toString("utf8");
            }
        }
        return buf.toString("utf8");
    };
    (res as any)._getBuffer = () => Buffer.concat(chunks);
    (res as any)._getStatusCode = () => statusCode;
    (res as any)._getHeaders = () => ({ ...headers });

    return res;
}

const tryParseJSON = (data: any) => {
    if (typeof data !== "string") return data;
    try {
        return JSON.parse(data);
    } catch {
        return data;
    }
};

export function create_mock(app: App) {
    const handler = app.handler();

    const request = async (init: MockInit = {}): Promise<MockResult> => {
        const req = createMockRequest(init);
        const res = createMockResponse();

        await handler(req as any, res as any);

        const rawBody = (res as any)._getData();
        const parsed = tryParseJSON(rawBody);

        return {
            status: (res as any).statusCode,
            headers: (res as any).getHeaders() as Record<string, any>,
            body: parsed,
            text:
                typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody),
            raw: res as any,
            request: req as any
        };
    };

    return {
        request,
        get: (url: string, init: MockInit = {}) =>
            request({ ...init, method: "GET", url }),
        post: (url: string, body?: any, init: MockInit = {}) =>
            request({ ...init, method: "POST", url, body }),
        put: (url: string, body?: any, init: MockInit = {}) =>
            request({ ...init, method: "PUT", url, body }),
        patch: (url: string, body?: any, init: MockInit = {}) =>
            request({ ...init, method: "PATCH", url, body }),
        delete: (url: string, init: MockInit = {}) =>
            request({ ...init, method: "DELETE", url })
    };
}
