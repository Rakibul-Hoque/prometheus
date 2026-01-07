import http from "http";
import type {
    Middleware,
    ScopedMiddleware,
    Plugin,
    Handler,
    Route,
    Context
} from "./types";
import { App as AppType } from "./types";
import { createContext } from "./context";
import { compose } from "./compose";

import { respond } from "./respond";
import { errorBoundary } from "./middleware/error-boundary";
import { notFound } from "./middleware/not-found";

import { addRoute, routerMiddleware } from "./router";

export class App {
    parent: App | null;
    children: App[] = [];
    middlewares: ScopedMiddleware[] = [];
    routes: Route[] = [];
    prefix: string = "";

    constructor(parent: App | null = null, prefix = "") {
        this.parent = parent;
        this.prefix = prefix;
    }

    use(fn: Middleware | Middleware[]) {
        
        if (fn instanceof Array) {
            if (Array.isArray(fn)) {
                for (const middleware of fn) {
                    this.middlewares.push({ fn: middleware, scope: this });
                }
            }
        } else {
            this.middlewares.push({ fn, scope: this });
        }
    }

    register(plugin: Plugin, prefix = ""): void {
        const child = new App(this, prefix);
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

    flattenMiddlewares(): Middleware[] {
        const result: Middleware[] = [];

        function walk(app: App) {
            result.push(...app.middlewares.map(m => m.fn));
            for (const child of app.children) walk(child);
        }
        walk(this);
        return result;
    }

    buildMiddlewareChain(): Middleware[] {
        return [
            errorBoundary,
            ...this.flattenMiddlewares(),
            routerMiddleware,
            notFound
        ];
    }

    listen(port: number) {
        const middleware = compose(this.buildMiddlewareChain());

        const server = http.createServer(async (req, res) => {
            const ctx = await createContext(req, res);
            ctx.app = this;

            await middleware(ctx);
            respond(ctx);
        });

        server.listen(port);
    }
}



