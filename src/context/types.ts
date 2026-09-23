import { App } from "../types";

// ---------- RequestContext (from adapters) ----------
export interface RequestContext {
    headers: Record<string, string | string[] | undefined>;
    method: string;
    url: string;
    body: Buffer | null;
    remoteAddress: string;
    host: string;
    port: number;
}

// ---------- Request ----------
export interface Request {
    method: string;
    url: string;
    path: string;
    headers: Record<string, string | string[] | undefined>;
    query: Record<string, string>;
    params: Record<string, string>;
    body: any;
    remoteAddress: string;

    // getters
    readonly ip: string;
    readonly type: string | undefined;
    readonly typeRaw: string | undefined;
    readonly cookies: Record<string, string> | undefined;

    get(name: string): string | undefined;
    is(type: string): boolean;
}

// ---------- Response ----------
export interface Response {
    headers: Map<string, string | string[]>;
    _body: any;
    _statusCode: number;

    status: number;
    body: any;
    type?: string;
    length?: number;

    get(name: string): string | string[] | undefined;
    set(name: string, value: string): void;
    set(headers: Record<string, string>): void;
    append(name: string, value: string): void;
    remove(name: string): void;
}

// ---------- Context ----------
export interface Context {
    app: App;
    rootApp: App;
    appStack: App[];
    currentApp: App;
    request: Request;
    response: Response;
    state: Record<string, any>;
    _responded___: boolean;
    _execState: {
        _isRouteFound___: boolean;
        _redirect___: boolean;
        _proxy___?: boolean;
        [key: string]: any;
    };

    // shortcuts (proxy to request/response)
    method: string;
    path: string;
    url: string;
    headers: Record<string, string | string[] | undefined>;
    query: Record<string, string>;
    params: Record<string, string>;
    body: any;
    status: number;
    type?: string;
    ip: string;

    // helpers
    get(name: string): string | undefined;
    set(name: string, value: string): void;
    set(headers: Record<string, string>): void;
    get responded(): boolean;

    readFile(path: string, setType?: boolean): Promise<Buffer>;
    readStream(path: string, setType?: boolean): import("fs").ReadStream;

    redirect(url: string, status?: number): void;
    assert(condition: any, message: string, status?: number): void;
    throw(status: number, message?: string): never;
    send(data?: any, status?: number | null, type?: string | null): void;
    end(...args: any[]): void;
    emit(event: string, ...args: any[]): boolean;
}
