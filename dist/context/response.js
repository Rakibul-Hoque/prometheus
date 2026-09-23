"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.responsePrototype = void 0;
const mime_1 = require("../mime");
exports.responsePrototype = {
    get status() {
        return this._statusCode ?? 200;
    },
    set status(code) {
        this._statusCode = code;
    },
    get body() {
        return this._body;
    },
    set body(v) {
        this._body = v;
    },
    get type() {
        return this.get("content-type");
    },
    set type(value) {
        const mime = (0, mime_1.getMimeType)(value) || value;
        this.set("Content-Type", mime);
    },
    get(name) {
        return this.headers.get(name.toLowerCase());
    },
    set(nameOrHeaders, value) {
        if (typeof nameOrHeaders === "object") {
            for (const [k, v] of Object.entries(nameOrHeaders)) {
                this.headers.set(k.toLowerCase(), v);
            }
        }
        else if (value !== undefined) {
            this.headers.set(nameOrHeaders.toLowerCase(), value);
        }
    },
    append(name, value) {
        const key = name.toLowerCase();
        const prev = this.headers.get(key);
        if (!prev)
            this.headers.set(key, value);
        else if (Array.isArray(prev))
            this.headers.set(key, [...prev, value]);
        else
            this.headers.set(key, [prev, value]);
    },
    remove(name) {
        this.headers.delete(name.toLowerCase());
    }
};
