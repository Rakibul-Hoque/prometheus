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
        return this.get("Content-Type");
    },
    set type(value) {
        const mime = (0, mime_1.getMimeType)(value) || value;
        this.set("Content-Type", mime);
    },
    get(name) {
        return this.headers.get(name);
    },
    set(nameOrHeaders, value) {
        if (typeof nameOrHeaders === "object") {
            for (const [k, v] of Object.entries(nameOrHeaders))
                this.headers.set(k, v);
        }
        else if (value) {
            this.headers.set(nameOrHeaders, value);
        }
    },
    append(name, value) {
        const prev = this.headers.get(name);
        if (!prev)
            this.headers.set(name, value);
        else if (Array.isArray(prev))
            this.headers.set(name, [...prev, value]);
        else
            this.headers.set(name, [String(prev), value]);
    },
    remove(name) {
        this.headers.delete(name);
    },
};
