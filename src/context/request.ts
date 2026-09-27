import type { Request } from "./types";
import { getReverseMimeType } from "../mime";

export const requestPrototype: Partial<Request> = {
  get(name: string): string | undefined {
    const self = this as Request;
    const val = self.headers?.[name.toLowerCase()];
    if (Array.isArray(val)) return val[0] as string;
    return val as string | undefined;
  },

  get type(): string | undefined {
    const self = this as Request;
    const raw = self.get?.("content-type")?.split(";")[0]?.trim()?.toLowerCase();
    return raw? getReverseMimeType(raw) : undefined;
  },

  get typeRaw(): string | undefined {
    const self = this as Request;
    return self.get?.("content-type")?.split(";")[0]?.trim();
  },

  get ip(): string {
    const self = this as Request;
    const xfwd = self.headers?.["x-forwarded-for"];
    const raw = Array.isArray(xfwd)? xfwd[0] : xfwd;
    if (typeof raw === "string") return raw.split(",")[0]!.trim();
    return self.remoteAddress;
  },

  is(type: string): boolean {
    const self = this as Request & { type?: string };
    return typeof self.type === "string" && self.type.includes(type);
  },

  get cookies(): Record<string, string> | undefined {
    const self = this as Request;
    const cookieString = self.get?.("cookie");
    if (!cookieString) return undefined;
    const cookies: Record<string, string> = {};
    for (const c of cookieString.split(";")) {
      const [k,...rest] = c.trim().split("=");
      if (k) cookies[k] = decodeURIComponent(rest.join("="));
    }
    return cookies;
  },
};