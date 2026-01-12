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
import { App as BaseApp } from "./types";
import { createContext } from "./context/createContext";
import { dispatch, compose } from "./compose";

import { respond } from "./respond";
import type { AppOptions } from "./config";
import { defaultOptions, installSystem } from "./config";
import { RadixRouter } from "./radix_router";

export class App extends BaseApp {
    parent: App | null;
    stack: Array<
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
    > = [];

    systemPre: Middleware[] = [];
    systemPost: Middleware[] = [];
    prefix: string = "";
    options: Required<AppOptions>;
    _router: RadixRouter;
    constructor(
        options: AppOptions = {},
        parent: App | null = null,
        prefix = ""
    ) {
        super();
        this.parent = parent;
        this.prefix = prefix;
        this.options = { ...defaultOptions, ...options };
        this._router = new RadixRouter();
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
        this.add("GET", path, handler);
        return this;
    }

    post(path: string, handler: Handler) {
        this.add("POST", path, handler);
        return this;
    }

    put(path: string, handler: Handler) {
        this.add("PUT", path, handler);
        return this;
    }

    delete(path: string, handler: Handler) {
        this.add("DELETE", path, handler);
        return this;
    }
    add(method, path, handler) {
        const fullPath = this.prefix + path;
        this._router.add(method, fullPath, handler);
        this.stack.push({
            type: "route" as const,
            item: { method, path: fullPath, handler}
        });
    }

    listen(port: number) {
        const server = http.createServer(async (req, res) => {
            const ctx = await createContext(req, res, this);

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
