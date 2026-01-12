// types.ts
export { EventEmitter } from "./events"; 
export type { Context } from "./context/types"; 


import { IncomingMessage, ServerResponse } from "http";
import { EventEmitter } from "./events";

export type Next = () => Promise<void>;

export type Middleware = (ctx: Context, next: Next) => Promise<void>;

export type LayerMiddleware = {
    fn: Middleware;
    prefix: string;
};

export type Handler = (ctx: Context) => Promise<void>;

export type Plugin = (app: App) => void;

export interface Request {
    body: any;
}

export interface AppOptions {
    errorBoundary?: boolean;
    logger?: boolean;
    timing?: boolean;
    notFound?: boolean;
}

export interface RadixNode {
    path: string;
    handlers: Map<string, Handler>;
    children: Map<string, RadixNode>;
    paramChild?: RadixNode;
    paramName?: string;
    wildcardChild?: RadixNode;
    priority: number;
}

export class App extends EventEmitter {}
