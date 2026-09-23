import type { Request } from "./types";
import { getReverseMimeType } from "../mime";

export const requestPrototype :Request= {
    get(name: string) {
        const val = this.headers[name.toLowerCase()];
        if (Array.isArray(val)) return val[0] as string;
        return val as string | undefined;
    },
    get type() {
        const raw = this.get("content-type")
            ?.split(";")[0]
            .trim()
            .toLowerCase();
        return raw ? getReverseMimeType(raw) : undefined;
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
    is(type: string) {
        const ct = this.type;
        return typeof ct === "string" && ct.includes(type);
    },
    get cookies() {
        const cookieString = this.get("cookie");
        if (!cookieString) return undefined;
        const cookies: Record<string, string> = {};
        cookieString.split(";").forEach(c => {
            const [k, ...rest] = c.trim().split("=");
            if (k) cookies[k] = decodeURIComponent(rest.join("="));
        });
        return cookies;
    }
} 
