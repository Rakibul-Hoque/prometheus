import http from "http";
import type {
    Middleware,
    LayerMiddleware,
    Plugin,
    Handler,
    Context,
    ErrorHandler,
    NotFoundHandler
} from "./types";
import { createContext } from "./context";
import { dispatch, compose } from "./compose";
import { addRoute } from "./router";
import { respond } from "./respond";
import type { AppOptions } from "./config";
import { defaultOptions, installSystem } from "./config";
import { defaultOnErrorHandler, defaultOnNotFoundHandler } from "./errors";

export class App {
    parent: App | null;

    stack: Array<{
        type: "middleware" | "child";
        item: LayerMiddleware | App;
    }> = [];

    systemPre: Middleware[] = [];
    systemPost: Middleware[] = [];
    prefix: string = "";
    options: Required<AppOptions>;
    _onError?: ErrorHandler = defaultOnErrorHandler;
    _onNotFound?: NotFoundHandler = defaultOnNotFoundHandler;
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
            const layer = {
                fn: middleware,
                prefix: this.prefix + prefix
            };

            this.stack.push({ type: "middleware", item: layer });
        }
    }

    register(plugin: Plugin, prefix: string = "") {
        const child = new App(this.options, this, this.prefix + prefix);

        this.stack.push({ type: "child", item: child });
        plugin(child);
    }

    get(path: string, handler: Handler) {
        addRoute("GET", path, handler, this);
        return this;
    }
    post(path: string, handler: Handler) {
        addRoute("POST", path, handler, this);
        return this;
    }
    put(path: string, handler: Handler) {
        addRoute("PUT", path, handler, this);
        return this;
    }
    delete(path: string, handler: Handler) {
        addRoute("DELETE", path, handler, this);
        return this;
    }

    onError(handler: ErrorHandler) {
        this._onError = handler;
        return this;
    }

    onNotFound(handler: NotFoundHandler) {
        this._onNotFound = handler;
        return this;
    }

    listen(port: number) {
        const server = http.createServer(async (req, res) => {
            const ctx = await createContext(req, res);
            ctx.app = this;
            try {
                const fn = compose([
                    ...this.systemPre,
                       async (ctx, next) => {
                        await dispatch(this, ctx);
                        if (ctx.body === undefined) {
                            await next();
                        }
                    },
                    ...this.systemPost
                ]); 
                await fn(ctx);
            } finally {
                await respond(ctx);
            }
        });

        server.listen(port);
    }
}
