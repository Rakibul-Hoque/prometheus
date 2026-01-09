import http from "http";
import { EventEmitter } from "../events";
import type { Context } from "./types";

export const contextPrototype: Partial<Context> = {
    get method() {
        return this.request.method;
    },

    get path() {
        return this.request.path;
    },

    get headers() {
        return this.request.headers;
    },

    get query() {
        return this.request.query;
    },
    get ip() {
        return this.request.ip;
    },

    get params() {
        return this.request.params;
    },

    set params(value) {
        this.request.params = value;
    },

    get body() {
        return this.response.body;
    },
    set body(value: any) {
        this.response.body = value;
    },

    get status() {
        return this.response.status;
    },
    set status(code: number) {
        this.response.status = code;
    },

    get type() {
        return this.response.type;
    },
    set type(value: string) {
        this.response.type = value;
    },

    /* helpers */
    get(name: string) {
        return this.request.get(name);
    },

    set(name: string, value: string) {
        this.response.set(name, value);
    },

    throw(status: number, message?: string): never {
        const err: any = new Error(
            message || http.STATUS_CODES[status] || "Error"
        );
        err.status = status;
        err.expose = status < 500;
        throw err;
    },

    assert(condition: any, message: string, status = 400) {
        if (!condition) this.throw(status, message);
    },

    emit(event: string, ...args: any[]) {
        return this.app.emit(event, ...args);
    }
};
