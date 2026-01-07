import http from "http";
import type {
    Middleware,
    LayerMiddleware,
    Plugin,
    Handler,
    Route,
    Context
} from "./types";
import { App as AppType } from "./types";
import { createContext } from "./context";
import { dispatch } from "./compose";

import { respond } from "./respond";
import { errorBoundary } from "./middleware/error-boundary";
import { notFound } from "./middleware/not-found";

import { addRoute } from "./router";

export class App {
    parent: App | null;
    children: App[] = [];
    middlewares: LayerMiddleware[] = [];
    routes: Route[] = [];
    prefix: string = "";

    constructor(parent: App | null = null, prefix = "") {
        this.parent = parent;
        this.prefix = prefix;
    }

    use(fn: Middleware | Middleware[], prefix: string = "") {
        const list = Array.isArray(fn) ? fn : [fn];
        for (const middleware of list) {
            this.middlewares.push({
                fn: middleware,
                prefix: this.prefix + prefix
            });
        }
    }

    register(plugin: Plugin, prefix: string = "") {
        const child = new App(this, this.prefix + prefix);
        this.children.push(child);
        plugin(child);
    }

    get(path: string, handler: Handler) {
        addRoute("GET", path, handler, this);
    }
    post(path: string, handler: Handler) {
        addRoute("POST", path, handler, this);
    }
    put(path: string, handler: Handler) {
        addRoute("PUT", path, handler, this);
    }
    delete(path: string, handler: Handler) {
        addRoute("DELETE", path, handler, this);
    }

    listen(port: number) {
        const server = http.createServer(async (req, res) => {
            const ctx = await createContext(req, res);
            ctx.app = this;

            await dispatch(this, ctx);

            if (ctx.body === undefined) {
                ctx.status = 404;
                ctx.body = { error: "Not Found" };
            }

            respond(ctx);
        });

        server.listen(port);
    }
}
