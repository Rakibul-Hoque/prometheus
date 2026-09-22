"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestPrototype = void 0;
const mime_1 = require("../mime");
exports.requestPrototype = {
    get(name) {
        return this.headers[name.toLowerCase()];
    },
    get type() {
        const raw_type = this.get("Content-Type")
            ?.split(";")[0]
            .trim()
            .toLowerCase();
        return (0, mime_1.getReverseMimeType)(raw_type);
    },
    get typeRaw() {
        return this.get("Content-Type")?.split(";")[0].trim();
    },
    get ip() {
        const xfwd = this.headers["X-Forwarded-For"];
        return typeof xfwd === "string"
            ? xfwd.split(",")[0].trim()
            : this.remoteAddress;
    },
    is(type) {
        const ct = this.type;
        return typeof ct === "string" && ct.includes(type);
    },
    get cookies() {
        const cookieString = this.get("cookie");
        if (cookieString) {
            const cookies = {};
            cookieString
                .split(";")
                .map(c => c.trim())
                .map(c => {
                const pair = c.split("=").map(p => p.trim());
                if (pair.length == 2)
                    cookies[pair[0]] = pair[1];
            });
            return cookies;
        }
        return undefined;
    }
};
