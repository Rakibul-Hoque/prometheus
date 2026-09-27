"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestPrototype = void 0;
const mime_1 = require("../mime");
exports.requestPrototype = {
    get(name) {
        const self = this;
        const val = self.headers?.[name.toLowerCase()];
        if (Array.isArray(val))
            return val[0];
        return val;
    },
    get type() {
        const self = this;
        const raw = self.get?.("content-type")?.split(";")[0]?.trim()?.toLowerCase();
        return raw ? (0, mime_1.getReverseMimeType)(raw) : undefined;
    },
    get typeRaw() {
        const self = this;
        return self.get?.("content-type")?.split(";")[0]?.trim();
    },
    get ip() {
        const self = this;
        const xfwd = self.headers?.["x-forwarded-for"];
        const raw = Array.isArray(xfwd) ? xfwd[0] : xfwd;
        if (typeof raw === "string")
            return raw.split(",")[0].trim();
        return self.remoteAddress;
    },
    is(type) {
        const self = this;
        return typeof self.type === "string" && self.type.includes(type);
    },
    get cookies() {
        const self = this;
        const cookieString = self.get?.("cookie");
        if (!cookieString)
            return undefined;
        const cookies = {};
        for (const c of cookieString.split(";")) {
            const [k, ...rest] = c.trim().split("=");
            if (k)
                cookies[k] = decodeURIComponent(rest.join("="));
        }
        return cookies;
    },
};
