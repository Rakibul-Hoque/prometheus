import { getMimeType } from "../mime";
import type { Response } from "./types";

export const responsePrototype:Response = {
    get status() {
        return this._statusCode ?? 200;
    },
    set status(code: number) {
        this._statusCode = code;
    },

    get body() {
        return this._body;
    },
    set body(v: any) {
        this._body = v;
    },

    get type() {
        return this.get("content-type") as string | undefined;
    },
    set type(value: string) {
        const mime = getMimeType(value) || value;
        this.set("Content-Type", mime);
    },

    get(name: string) {
        return this.headers.get(name.toLowerCase());
    },

    set(nameOrHeaders: any, value?: string) {
        if (typeof nameOrHeaders === "object") {
            for (const [k, v] of Object.entries(nameOrHeaders)) {
                this.headers.set(k.toLowerCase(), v as string);
            }
        } else if (value !== undefined) {
            this.headers.set(nameOrHeaders.toLowerCase(), value);
        }
    },

    append(name: string, value: string) {
        const key = name.toLowerCase();
        const prev = this.headers.get(key);
        if (!prev) this.headers.set(key, value);
        else if (Array.isArray(prev)) this.headers.set(key, [...prev, value]);
        else this.headers.set(key, [prev as string, value]);
    },

    remove(name: string) {
        this.headers.delete(name.toLowerCase());
    }
} 
