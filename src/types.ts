import type { EventEmitter } from "./events";
import type { Context, RequestContext } from "./context/types";
import { RadixRouter } from "./radix_router";
export type { EventEmitter } from "./events";
export type { Context } from "./context/types";

export type Next = () => Promise<void>;

export type Middleware = (ctx: Context, next: Next) => Promise<void>;

export type ComposedMiddleware = (ctx: Context) => Promise<void>;

export type Handler = (ctx: Context) => Promise<void> | void;

export type ErrorHandler = (
    ctx: Context,
    err: Error & { status?: number }
) => void;

export type NotFoundHandler = (ctx: Context) => void;

export type Plugin<T = any> = (app: App, opts: T) => void | Promise<void>;

export type RequestHandler = (reqCtx: RequestContext) => Promise<Context>;

export interface LayerMiddleware {
    fn: Middleware;
    prefix: string;
}

export interface Route {
    method: string;
    path: string;
    middleware: Middleware[];
    handler: Handler;
    execute?: ComposedMiddleware;
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

export type StackItem =
    | { type: "middleware"; item: LayerMiddleware }
    | { type: "child"; item: App }
    | { type: "route"; item: Route };

export type StackType = StackItem[];

export interface AppOptions {
    errorBoundary?: boolean;
    bodyParser?: boolean;
    logger?: boolean;
    timing?: boolean;
    notFound?: boolean;
}

export type ResolvedAppOptions = Required<AppOptions>;

export interface App extends EventEmitter {
    parent: App | null;
    stack: StackType;
    prefix: string;
    options: ResolvedAppOptions;
    systemPre: Middleware[];
    systemPost: Middleware[];
    router: RadixRouter;
    use(fn: Middleware | Middleware[], prefix?: string): void;
    register<T = any>(plugin: Plugin<T>, opts?: T): this;
    get(path: string, ...handlers: (Middleware | Handler)[]): this;
    post(path: string, ...handlers: (Middleware | Handler)[]): this;
    put(path: string, ...handlers: (Middleware | Handler)[]): this;
    delete(path: string, ...handlers: (Middleware | Handler)[]): this;
    decorate(name: string, value: any): void;
    decorateContext(name: string, value: any): void;
    handler(): RequestHandler;
    listen(
        port: number,
        callback?: () => void
    ): ReturnType<typeof import("node:http").createServer>;
}

export interface Err extends Error {
    status?: number;
    app?: App;
    expose?: boolean;

    details?: unknown;
}
