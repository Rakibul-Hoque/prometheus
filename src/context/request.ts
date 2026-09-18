import type { Request } from "./types";
import { getReverseMimeType } from "../mime";

export const requestPrototype: Partial<Request> = {
  get(name: string) {
    return this.headers[name.toLowerCase()];
  },
  get type() {
    const raw_type = this.get("Content-Type")?.split(";")[0].trim().toLowerCase();
    return getReverseMimeType(raw_type)
  },
  get typeRaw() {
    return this.get("Content-Type")?.split(";")[0].trim()
  },
  get ip() {
    const xfwd = this.headers["X-Forwarded-For"];
    return typeof xfwd === "string"
      ? xfwd.split(",")[0].trim()
      : this.req.socket.remoteAddress;
  },
  is(type: string) {
    const ct = this.type
    return typeof ct === "string" && ct.includes(type);
  }
};
