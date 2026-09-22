import http from "http";
import fsp from "fs/promises";
import fs from "fs";
import { getMimeType } from "../mime";
import { EventEmitter } from "../events";

import type { Context } from "./types";

export const baseContextPrototype: Partial<Context> = {
    get method() {
        return this.request.method;
    },
    get path() {
        return this.request.path;
    },
    get headers() {
        return this.request.headers;
    },
    get ip() {
        return this.request.ip;
    },
    get query() {
        return this.request.query;
    },
    set query(q) {
        this.request.query = q;
    },
    get params() {
        return this.request.params;
    },
    set params(v) {
        this.request.params = v;
    },

    get body() {
        return this.response.body;
    },
    set body(v) {
        this.response.body = v;
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
    set type(v: string) {
        this.response.type = v;
    },

    get(name: string) {
        return this.request.get(name);
    },
    set(nameOrHeaders: any, value?: string) {
        this.response.set(nameOrHeaders, value);
    },

    get currentApp() {
        return this.appStack[this.appStack.length - 1] ?? this.app;
    },
    get responded() {
        return this._responded___ === true;
    },
    async readFile(path: string, setType: boolean = true) {
        if (setType)
            this.type = getMimeType(path) || "application/octet-stream";
        return await fsp.readFile(path);
    },
    readStream(path: string, setType: boolean = true) {
        if (setType)
            this.type = getMimeType(path) || "application/octet-stream";
        return fs.createReadStream(path);
    },

    redirect(url: string, status = 302) {
        this.status = status;
        this.set("Location", url);
        this._execState._redirect___ = true;
        this.end();
    },
    assert(condition: any, message: string, status = 400) {
        if (!condition) this.throw(status, message);
    },

    emit(event: string, ...args: any[]) {
        return this.currentApp.emit(event, ...args);
    },
    throw(status: number, message?: string): never {
        const err: any = new Error(
            message || http.STATUS_CODES[status] || "Error"
        );
        err.status = status;
        err.expose = status < 500;
        err.app = this.currentApp;
        throw err;
    },

    send(
        data: any | null = null,
        status: number | null = null,
        type: string | null = null
    ) {
        if (this._responded___) return;
        if (data !== null && data !== undefined) this.body = data;
        if (status !== null && status !== undefined) this.status = status;
        if (type) this.type = type;
        this._responded___ = true;
    },

    end(...args: any[]) {
        if (args.length > 0) this.send(...(args as any));
        else this._responded___ = true;
    }
};
