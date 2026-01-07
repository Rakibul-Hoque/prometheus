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
import { dispatch, compose } from "./compose";

import { addRoute } from "./router";
import { respond } from "./respond";

import type { AppOptions } from "./config";
import { defaultOptions, installSystem } from "./config";

export class App {
    parent: App | null;
    children: App[] = [];
    middlewares: LayerMiddleware[] = [];

    systemPre: Middleware[] = [];
    systemPost: Middleware[] = [];
    prefix: string = "";
    options: Required<AppOptions>;
    constructor(
        options: AppOptions = {},
        parent: App | null = null,
        prefix = ""
    ) {
        this.parent = parent;
        this.prefix = prefix;
        this.options = { ...defaultOptions, ...options };

        installSystem(this);
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
        const child = new App(this.options, this, this.prefix + prefix);
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

            const fn = compose([
                ...this.systemPre,
                async (ctx, next) => {
                    await dispatch(this, ctx);
                    await next();
                },
                ...this.systemPost
            ]);

            await fn(ctx);
            respond(ctx);
        });

        server.listen(port);
    }
}
