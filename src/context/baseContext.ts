import http from "http";
import fsp from "fs/promises";
import fs from "fs";
import { getMimeType } from "../mime";
import type { Context } from "./types";

export const baseContextPrototype: Partial<Context> = {
    get method(): string {
        return (this as Context).request.method;
    },
    get path(): string {
        return (this as Context).request.path;
    },
    get url(): string {
        return (this as Context).request.url;
    },
    get headers(): any {
        return (this as Context).request.headers;
    },
    get ip(): string {
        return (this as Context).request.ip;
    },

    get query(): Record<string, string | number | number[] | string[]> {
        return (this as Context).request.query;
    },
    set query(q: Record<string, string | number | number[] | string[]>) {
        (this as Context).request.query = q;
    },

    get params(): Record<string, string | number> {
        return (this as Context).request.params;
    },
    set params(v: Record<string, string | number>) {
        (this as Context).request.params = v;
    },

    get body(): any {
        return (this as Context).response.body;
    },
    set body(v: any) {
        (this as Context).response.body = v;
    },

    get status(): number {
        return (this as Context).response.status;
    },
    set status(code: number) {
        (this as Context).response.status = code;
    },

    get type(): string | undefined {
        return (this as Context).response.type;
    },
    set type(v: string | undefined) {
        (this as Context).response.type = v;
    },

    get(name: string): string | undefined {
        return (this as Context).request.get(name);
    },
    set(nameOrHeaders: any, value?: string): void {
        const self = this as Context;
        if (value === undefined) self.response.set(nameOrHeaders);
        else self.response.set(nameOrHeaders, value);
    },

    get currentApp() {
        const self = this as Context;
        return self.appStack[self.appStack.length - 1] ?? self.app;
    },
    get responded(): boolean {
        return (this as Context)._responded___ === true;
    },

    async readFile(path: string, setType = true): Promise<Buffer> {
        const self = this as Context;
        if (setType)
            self.type = getMimeType(path) || "application/octet-stream";
        return await fsp.readFile(path);
    },
    readStream(path: string, setType = true): fs.ReadStream {
        const self = this as Context;
        if (setType)
            self.type = getMimeType(path) || "application/octet-stream";
        return fs.createReadStream(path);
    },

    redirect(url: string, status = 302): void {
        const self = this as Context;
        self.status = status;
        self.set("Location", url);
        self._execState._redirect___ = true;
        (self as any).end();
    },

    assert(condition: any, message: string, status = 400): void {
        if (!condition) (this as Context).throw(status, message);
    },

    emit(event: string, ...args: any[]): boolean {
        return (this as Context).currentApp.emit(event, ...args);
    },

    throw(status: number, message?: string): never {
        const self = this as Context;
        const err: any = new Error(
            message || (http.STATUS_CODES as any)[status] || "Error"
        );
        err.status = status;
        err.expose = status < 500;
        err.app = self.currentApp;
        throw err;
    },

    send(
        data: any = null,
        status: number | null = null,
        type: string | null = null
    ): void {
        const self = this as Context;
        if (self._responded___) return;
        if (data !== null && data !== undefined) self.body = data;
        if (status !== null && status !== undefined) self.status = status;
        if (type) self.type = type;
        self._responded___ = true;
    },

    end(...args: any[]): void {
        const self = this as Context;
        if (args.length > 0) (self as any).send(...args);
        else self._responded___ = true;
    }
};
