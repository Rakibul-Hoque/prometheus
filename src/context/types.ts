import { IncomingMessage, ServerResponse } from "http";
import { EventEmitter } from "../events";

export interface Request {
    req: IncomingMessage;
    method: string;
    path: string;
    url: string;
    headers: IncomingMessage["headers"];
    query: Record<string, string>;
    params: Record<string, string>;
    body: any;

    get(name: string): any;
    is(type: string): boolean;
}

export interface Response {
    res: ServerResponse;
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
    app: EventEmitter;

    req: IncomingMessage;
    res: ServerResponse;

    request: Request;
    response: Response;

    state: Record<string, any>;
    responded: boolean;

    /* shortcuts */
    method: string;
    path: string;
    headers: IncomingMessage["headers"];
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

    /* events */
    emit(event: string, ...args: any[]): boolean;
}
