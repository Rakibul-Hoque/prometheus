import { getMimeType, getReverseMimeType } from "../mime";
import type { Response } from "./types";

export const responsePrototype: Partial<Response> = {
    get status() {
        return this._statusCode ?? 200;
    },
    set status(code: number) {
        this._statusCode = code;
    },

    get body() {
        return this._body;
    },
    set body(v) {
        this._body = v;
    },

    get type() {
        return this.get("Content-Type");
    },
    set type(value: string) {
        const mime = getMimeType(value) || value;
        this.set("Content-Type", mime);
    },

    get(name: string) {
        return this.headers.get(name);
    },
    set(nameOrHeaders: any, value?: string) {
        if (typeof nameOrHeaders === "object") {
            for (const [k, v] of Object.entries(nameOrHeaders))
                this.headers.set(k, v as string);
        } else if (value) {
            this.headers.set(nameOrHeaders, value);
        }
    },
    append(name: string, value: string) {
        const prev = this.headers.get(name);
        if (!prev) this.headers.set(name, value);
        else if (Array.isArray(prev)) this.headers.set(name, [...prev, value]);
        else this.headers.set(name, [String(prev), value]);
    },

    remove(name: string) {
        this.headers.delete(name);
    },
};
