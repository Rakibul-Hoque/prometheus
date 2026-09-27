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
        const self = this;
        return self.headers?.get("content-type");
    },
    set type(value) {
        const self = this;
        const mime = (0, mime_1.getMimeType)(value) || value;
        self.headers.set("content-type", mime);
    },
    get(name) {
        return this.headers.get(name.toLowerCase());
    },
    set(nameOrHeaders, value) {
        const self = this;
        if (typeof nameOrHeaders === "object") {
            for (const [k, v] of Object.entries(nameOrHeaders)) {
                self.headers.set(k.toLowerCase(), v);
            }
        }
        else if (value !== undefined) {
            self.headers.set(nameOrHeaders.toLowerCase(), value);
        }
    },
    append(name, value) {
        const self = this;
        const key = name.toLowerCase();
        const prev = self.headers.get(key);
        if (!prev)
            self.headers.set(key, value);
        else if (Array.isArray(prev))
            self.headers.set(key, [...prev, value]);
        else
            self.headers.set(key, [prev, value]);
    },
    remove(name) {
        this.headers.delete(name.toLowerCase());
    },
};
