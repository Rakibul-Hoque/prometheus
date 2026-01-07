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

import { parsePath,  routerMiddleware} from "./router";

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

    use(fn: Middleware) {
        this.middlewares.push({ fn, scope: this });
    }

    register(plugin: Plugin, prefix = ""): void {
        const child = new App(this, prefix);
        this.children.push(child);
        plugin(child);
    }

    addRoute(method: string, path: string, handler: Handler) {
        const fullPath = this.prefix + path;
        const { pattern, keys } = parsePath(fullPath);

        this.routes.push({
            method: method.toUpperCase(),
            path: fullPath,
            handler,
            scope: this,
            keys,
            pattern
        });
    }

    get(path: string, handler: Handler) {
        this.addRoute("GET", path, handler);
    }
    post(path: string, handler: Handler) {
        this.addRoute("POST", path, handler);
    }
    put(path: string, handler: Handler) {
        this.addRoute("PUT", path, handler);
    }
    delete(path: string, handler: Handler) {
        this.addRoute("DELETE", path, handler);
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
