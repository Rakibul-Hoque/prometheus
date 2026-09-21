import http from "http";
import fsp from "fs/promises";
import fs from "fs";
import { getMimeType } from "../mime";
import { EventEmitter } from "../events";

import type { Context } from "./types";

export const baseContextPrototype: Partial<Context> = {
    _responded___: false,
    _execState: {
        _isRouteFound___: false,
        _redirect___: false
    },

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
    
    set query(value) {
         this.request.query=value
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

    get(name: string) {
        return this.request.get(name);
    },

    set(nameOrHeaders: string | Record<string, string>, value?: string) {
        this.response.set(nameOrHeaders, value);
    },

    get currentApp() {
        return this.appStack[this.appStack.length - 1] ?? this.app;
    },
    throw(status: number, message: string): never {
        const err: any = new Error(
            message || http.STATUS_CODES[status] || "Error"
        );
        err.status = status;
        err.expose = status < 500;
        throw err;
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
        this.response.redirect(url, status);
    },
    assert(condition: any, message: string, status = 400) {
        if (!condition) this.throw(status, message);
    },

    emit(event: string, ...args: any[]) {
        return this.currentApp.emit(event, ...args);
    },

    get responded(): boolean {
        return this._responded___ ? true : false;
    },

    send(
        data: any | null = null,
        status: number | null = null,
        type: string | null = null
    ): void {
        if (this._responded___) return;

        try {
            if (data) this.body = data;
            if (status) this.status = status;
            if (type) this.type = type;
        } finally {
            this._responded___ = true;
        }
    },
    end(...args: any[]) {
        if (args.length > 0) this.send(...args);
        else this._responded___ = true;
    }
};
