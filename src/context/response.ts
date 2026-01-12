import { getMimeType } from "../mime";
import type { Response } from "./types";

export const responsePrototype: Partial<Response> = {
    get status() {
        return this.res.statusCode;
    },
    set status(code: number) {
        this.res.statusCode = code;
    },

    get type() {
        return this.res.getHeader("Content-Type") as string;
    },
    set type(value: string) {
        const mime = getMimeType(value) || value;
        this.set("Content-Type", mime);
    },

    set(name: string, value: string) {
        this.res.setHeader(name, value);
    },

    append(name: string, value: string) {
        const prev = this.res.getHeader(name);
        if (!prev) this.res.setHeader(name, value);
        else if (Array.isArray(prev))
            this.res.setHeader(name, [...prev, value]);
        else this.res.setHeader(name, [String(prev), value]);
    },

    remove(name: string) {
        this.res.removeHeader(name);
    },

    redirect(url: string, status = 302) {
        this.status = status;
        this.set("Location", url);
        this.body = { _redirect: true };
    }
};
