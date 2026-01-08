// types.ts
import { IncomingMessage, ServerResponse } from "http";

export type Next = () => Promise<void>;

export type Middleware = (ctx: Context, next: Next) => Promise<void>;

export type ErrorHandler = (ctx: Context, error: Error) => void | Promise<void>;

export type NotFoundHandler = (ctx: Context) => void | Promise<void>;

export type LayerMiddleware = {
    fn: Middleware;
    prefix: string;
};

export type Handler = (ctx: Context) => Promise<void>;

export type Plugin = (app: App) => void;

export interface Request {
    body: any;
}

export interface Context {
    req: IncomingMessage;
    res: ServerResponse;

    method: string;
    path: string;
    headers: IncomingMessage["headers"];
    query: URLSearchParams;
    params: Record<string, string>;

    request: Request; 
    status: number; 
    body: any; 
    responded: boolean;
    type?: string;
    redirect(url: string, status?: number): void;
    set(name: string, value: string): void;
    throw(status: number, message?: string): never;
    assert(condition: any, message: string, status: number): never;
}

export class App {}
