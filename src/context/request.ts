import type { Request } from "./types";

export const requestPrototype: Partial<Request> = {
    get(name: string) {
        return this.headers[name.toLowerCase()];
    },


get ip() {
    const xfwd = this.headers["x-forwarded-for"];
    return typeof xfwd === "string"
        ? xfwd.split(",")[0].trim()
        : this.req.socket.remoteAddress;
},
    is(type: string) {
        const ct = this.headers["content-type"];
        return typeof ct === "string" && ct.includes(type);
    }
};
