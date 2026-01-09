// types.ts
import { IncomingMessage, ServerResponse } from "http";
export type { Context } from "./context/types";

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

export class App {}
