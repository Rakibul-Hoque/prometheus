"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestPrototype = void 0;
const mime_1 = require("../mime");
exports.requestPrototype = {
    get(name) {
        const val = this.headers[name.toLowerCase()];
        if (Array.isArray(val))
            return val[0];
        return val;
    },
    get type() {
        const raw = this.get("content-type")
            ?.split(";")[0]
            .trim()
            .toLowerCase();
        return raw ? (0, mime_1.getReverseMimeType)(raw) : undefined;
    },
    get typeRaw() {
        return this.get("Content-Type")?.split(";")[0].trim();
    },
    get ip() {
        const xfwd = this.headers["x-forwarded-for"];
        const val = Array.isArray(xfwd) ? xfwd[0] : xfwd;
        return typeof val === "string"
            ? val.split(",")[0].trim()
            : this.remoteAddress;
    },
    is(type) {
        const ct = this.type;
        return typeof ct === "string" && ct.includes(type);
    },
    get cookies() {
        const cookieString = this.get("cookie");
        if (!cookieString)
            return undefined;
        const cookies = {};
        cookieString.split(";").forEach(c => {
            const [k, ...rest] = c.trim().split("=");
            if (k)
                cookies[k] = decodeURIComponent(rest.join("="));
        });
        return cookies;
    }
};
