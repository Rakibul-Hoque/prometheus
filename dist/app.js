"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const events_1 = require("./events");
const baseContext_1 = require("./context/baseContext");
const createContext_1 = require("./context/createContext");
const compose_1 = require("./compose");
const final_parser_1 = require("./final-parser");
const config_1 = require("./config");
const radix_router_1 = require("./radix_router");
const util_1 = require("./util");
const adepter_1 = require("./adepter");
class App extends events_1.EventEmitter {
    parent = null;
    _handler = null;
    stack = [];
    router = new radix_router_1.RadixRouter();
    _decorators = new Map();
    _contextDecorators = new Map();
    systemPre = [];
    systemPost = [];
    prefix = "";
    options;
    _started = false;
    constructor(options = {}) {
        super();
        this.options = { ...config_1.defaultOptions, ...options };
        (0, config_1.installSystem)(this, this.options);
    }
    use(fn, prefix = "") {
        this._assertMutable();
        const list = Array.isArray(fn) ? fn : [fn];
        for (const middleware of list) {
            const layer = {
                fn: middleware,
                prefix: this.prefix + prefix
            };
            this.stack.push({ type: "middleware", item: layer });
        }
    }
    register(plugin, opts) {
        this._assertMutable();
        const prefix = typeof opts === "string"
            ? opts
            : (opts?.prefix ?? "");
        const childPrefix = (0, util_1.joinPaths)(this.prefix, prefix);
        const child = new App(this.options);
        child.parent = this;
        child.prefix = childPrefix;
        this._inheritDecoratorsToChild(child);
        this.stack.push({ type: "child", item: child });
        plugin(child, (opts ?? {}));
        return this;
    }
    _inheritDecoratorsToChild(child) {
        let parent = this;
        while (parent) {
            for (const [name] of parent._decorators) {
                if (!(name in child)) {
                    child._defineDecoratorProperty(name);
                }
            }
            parent = parent.parent;
        }
    }
    get(path, ...handlers) {
        return this.add("GET", path, handlers);
    }
    post(path, ...handlers) {
        return this.add("POST", path, handlers);
    }
    put(path, ...handlers) {
        return this.add("PUT", path, handlers);
    }
    delete(path, ...handlers) {
        return this.add("DELETE", path, handlers);
    }
    add(method, path, handlers) {
        this._assertMutable();
        if (handlers.length === 0) {
            throw new Error(`${method} ${path}: route requires a handler`);
        }
        const handler = handlers[handlers.length - 1];
        const middleware = handlers.slice(0, -1);
        const fullPath = (0, util_1.joinPaths)(this.prefix, path);
        const route = {
            method: method.toUpperCase(),
            path: fullPath,
            middleware,
            handler,
            paramNames: []
        };
        this.router.add(route);
        this.stack.push({ type: "route", item: route });
        return this;
    }
    decorate(name, value) {
        this._assertMutable();
        if (this._decorators.has(name)) {
            throw new Error(`Decorator '${name}' already exists on this app instance`);
        }
        let current = this.parent;
        while (current) {
            if (current._decorators.has(name)) {
                throw new Error(`Decorator '${name}' already exists in parent scope`);
            }
            current = current.parent;
        }
        this._decorators.set(name, value);
        this._defineDecoratorProperty(name);
    }
    _defineDecoratorProperty(name) {
        const self = this;
        Object.defineProperty(this, name, {
            get() {
                let app = self;
                while (app) {
                    if (app._decorators.has(name)) {
                        return app._decorators.get(name);
                    }
                    app = app.parent;
                }
                return undefined;
            },
            enumerable: true,
            configurable: false
        });
    }
    decorateContext(name, value) {
        this._assertMutable();
        if (this._contextDecorators.has(name)) {
            throw new Error(`Context decorator '${name}' already exists in this app`);
        }
        this._contextDecorators.set(name, value);
        if (!(name in baseContext_1.baseContextPrototype)) {
            Object.defineProperty(baseContext_1.baseContextPrototype, name, {
                get() {
                    const currentApp = this.currentApp;
                    if (!currentApp)
                        return undefined;
                    let app = currentApp;
                    while (app) {
                        if (app._contextDecorators.has(name)) {
                            return app._contextDecorators.get(name);
                        }
                        app = app.parent;
                    }
                    return undefined;
                },
                enumerable: true,
                configurable: true
            });
        }
    }
    _assertMutable() {
        if (this._started) {
            throw new Error("Cannot modify an application after handler is created  Error: handler()");
        }
    }
    handler() {
        if (this._handler)
            return this._handler;
        this._started = true;
        const appMiddleware = (0, compose_1.compile)(this);
        const requestMiddleware = (0, compose_1.compose)([
            ...this.systemPre,
            appMiddleware,
            ...this.systemPost
        ]);
        this._handler = async (reqCtx) => {
            const ctx = await (0, createContext_1.createContext)(reqCtx, this);
            await requestMiddleware(ctx);
            await (0, final_parser_1.finalParser)(ctx);
            return ctx;
        };
        return this._handler;
    }
    listen(port, callback) {
        return (0, adepter_1.createNodeServer)(this, port, callback);
    }
}
exports.App = App;
