import type { Handler, RadixNode } from "./types";

export class RadixRouter {
    private root: RadixNode;
    private cache: Map<
        string,
        { handler: Handler; params: Record<string, string> }
    >;
    private staticRoutes: Map<string, Map<string, Handler>>;
    private prefixCache: Set<string>;
    private maxCacheSize: number;

    constructor(maxCacheSize = 10000) {
        this.root = this.createNode("");
        this.cache = new Map();
        this.staticRoutes = new Map();
        this.prefixCache = new Set();
        this.maxCacheSize = maxCacheSize;
    }

    private createNode(path: string): RadixNode {
        return {
            path,
            handlers: new Map(),
            children: new Map(),
            priority: 0
        };
    }

    add(method: string, path: string, handler: Handler) {
        if (path[0] !== "/") path = "/" + path;
        if (path.length > 1 && path[path.length - 1] === "/") {
            path = path.slice(0, -1);
        }

        const methodUpper = method.toUpperCase();

        if (!path.includes(":") && !path.includes("*")) {
            if (!this.staticRoutes.has(path)) {
                this.staticRoutes.set(path, new Map());
            }
            this.staticRoutes.get(path)!.set(methodUpper, handler);
        }

        const segments = path.split("/").filter(Boolean);
        for (let i = 1; i <= segments.length; i++) {
            const prefix = "/" + segments.slice(0, i).join("/");
            this.prefixCache.add(prefix);
        }

        this.prefixCache.add("/");

        let node = this.root;

        for (const segment of segments) {
            if (segment[0] === ":") {
                const paramName = segment.slice(1);
                if (!node.paramChild) {
                    node.paramChild = this.createNode(":" + paramName);
                    node.paramChild.paramName = paramName;
                }
                node = node.paramChild;
                node.priority++;
            } else if (segment === "*") {
                if (!node.wildcardChild) {
                    node.wildcardChild = this.createNode("*");
                }
                node = node.wildcardChild;
                node.priority++;
            } else {
                if (!node.children.has(segment)) {
                    node.children.set(segment, this.createNode(segment));
                }
                node = node.children.get(segment)!;
                node.priority++;
            }
        }

        node.handlers.set(methodUpper, handler);
        this.clearCache();
    }
    

    find(
        method: string,
        path: string
    ): { handler: Handler; params: Record<string, string> } | null {
        if (path[0] !== "/") path = "/" + path;
        if (path.length > 1 && path[path.length - 1] === "/") {
            path = path.slice(0, -1);
        }

        const methodUpper = method.toUpperCase();

        const staticHandlers = this.staticRoutes.get(path);
        if (staticHandlers) {
            const handler = staticHandlers.get(methodUpper);
            if (handler) {
                return { handler, params: {} };
            }
        }

        const cacheKey = methodUpper + ":" + path;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const segments = path.split("/").filter(Boolean);
        const params: Record<string, string> = {};
        const result = this.search(this.root, segments, 0, methodUpper, params);

        if (result && this.cache.size < this.maxCacheSize) {
            this.cache.set(cacheKey, result);
        }

        return result;
    }

    private search(
        node: RadixNode,
        segments: string[],
        index: number,
        method: string,
        params: Record<string, string>
    ): { handler: Handler; params: Record<string, string> } | null {
        if (index === segments.length) {
            const handler = node.handlers.get(method);
            if (handler) {
                return { handler, params: { ...params } };
            }
            return null;
        }

        const segment = segments[index];

        const staticChild = node.children.get(segment);
        if (staticChild) {
            const result = this.search(
                staticChild,
                segments,
                index + 1,
                method,
                params
            );
            if (result) return result;
        }

        if (node.paramChild) {
            const paramName = node.paramChild.paramName!;
            params[paramName] = segment;

            const result = this.search(
                node.paramChild,
                segments,
                index + 1,
                method,
                params
            );
            if (result) return result;
            delete params[paramName];
        }

        if (node.wildcardChild) {
            params["*"] = segments.slice(index).join("/");
            const handler = node.wildcardChild.handlers.get(method);
            if (handler) {
                return { handler, params: { ...params } };
            }
        }

        return null;
    }

    clearCache() {
        this.cache.clear();
    }

    getStats() {
        return {
            cacheSize: this.cache.size,
            maxCacheSize: this.maxCacheSize,
            prefixCacheSize: this.prefixCache.size,
            staticRoutes: this.staticRoutes.size
        };
    }

    isEmpty(): boolean {
        return (
            this.root.handlers.size === 0 &&
            this.root.children.size === 0 &&
            !this.root.paramChild &&
            !this.root.wildcardChild
        );
    }
}


