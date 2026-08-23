import http from "http";
import fsp from "fs/promises";
import fs from "fs";
import { getMimeType } from "../mime";
import { EventEmitter } from "../events";
import type { Context } from "./types";

export const baseContextPrototype: Partial<Context> = {
    __responded__: false,

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

    get(name: string) {
        return this.request.get(name);
    },

    set(name: string, value: string) {
        this.response.set(name, value);
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
        return this.__responded__;
    },

    send(
        data: any | null = null,
        status: number | null = null,
        type: string | null = null
    ): void {
        try {
            if (data) this.body = data;
            if (status) this.status = status;
            if (type) this.type = type;
        } finally {
            this.__responded__ = true;
        }
    }, 
    end(...args:any[]){
      this.send(...args)
    }
};
