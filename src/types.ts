export { EventEmitter } from "./events";
import { EventEmitter } from "./events";

export type { Context } from "./context/types";
import { IncomingMessage, ServerResponse } from "http";

export type Next = () => Promise<void>;

export type Middleware = (ctx: Context, next: Next) => Promise<void>;

export type LayerMiddleware = {
    fn: Middleware;
    prefix: string;
};

export type Handler = (ctx: Context) => Promise<void>;

export type Plugin<T = any> = (app: App, opts: T) => void | Promise<void>;

export interface Route {
    method: string;
    path: string;
    middleware: Middleware[];
    handler: Handler;
    execute?: Middleware;
    paramNames: string[];
}

export interface RouteMatch {
    route: Route;
    params: Record<string, string>;
}

export interface RadixNode {
    path: string;
    handlers: Map<string, Route>;
    children: Map<string, RadixNode>;
    priority: number;
    paramChild?: RadixNode;
    wildcardChild?: RadixNode;
}

export interface Request {
    body: any;
}

export interface AppOptions {
    errorBoundary?: boolean;
    bodyParser?: boolean;
    logger?: boolean;
    timing?: boolean;
    notFound?: boolean;
}

export type StackType = Array<
    | { type: "middleware"; item: LayerMiddleware }
    | { type: "child"; item: App }
    | { type: "child"; item: App }
>;

export class App extends EventEmitter {}
