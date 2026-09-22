import { App } from "../types";

export interface RequestContext {
    headers: Record<string, string | (string | number)[]>;
    method: string;
    url: string;
    body: any;
    remoteAddress: string;
    host : string;
    port: number;
}

export interface Request {
    method: string;
    path: string;
    url: string;
    headers: Record<string, string | (string | number)[]>;
    query: Record<string, string | (string | number)[]>;
    params: Record<string, string>;
    body: any;
    remoteAddress: string;
    get(name: string): string;
    is(type: string): boolean;
}

export interface Response {
    headers: Record<string, string | (string | number)[]>;
    status: number;
    body: any;
    type?: string;
    length?: number;
    set(name: string, value: string): void;
    append(name: string, value: string): void;
    remove(name: string): void;
    redirect(url: string, status?: number): void;
}

export interface Context {
    app: App;
    appStack: App[];
    currentApp: App;

    request: Request;
    response: Response;

    state: Record<string, any>;
    _responded___: boolean;
    responded(): boolean;
    _execState: Record<string, boolean | string | number>;

    /* shortcuts */
    method: string;
    path: string;
    headers: Record<string, string | (string | number)[]>;
    query: Record<string, string>;
    params: Record<string, string>;
    body: any;
    status: number;
    type?: string;

    /* helpers */
    get(name: string): any;
    set(name: string, value: string): void;
    throw(status: number, message?: string): never;
    assert(condition: any, message: string, status?: number): void;
    send(data: any | null, status: number | null, type: string | null): void;
    end(...args: any[]): void;
    /* events */
    emit(event: string, ...args: any[]): boolean;
}
