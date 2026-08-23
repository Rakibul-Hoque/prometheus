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

export type StackType = Array<
    | { type: "middleware"; item: LayerMiddleware }
    | { type: "child"; item: App }
    | {
          type: "route";
          item: {
              method: string;
              path: string;
              handler: Handler;
          };
      }
>;
