import { IncomingMessage, ServerResponse } from "http";
import { requestPrototype } from "./request";
import { responsePrototype } from "./response";
import { contextPrototype } from "./context";
import { parseRequestBody, searchParamsToObject } from "./utils";
import type { Context } from "./types";

export async function createContext(
    req: IncomingMessage,
    res: ServerResponse,
    app: any
): Promise<Context> {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    const ctx = Object.create(contextPrototype) as Context;
    const request = Object.create(requestPrototype);
    const response = Object.create(responsePrototype);

    ctx.app = app;
    ctx.appStack = [];

    ctx.req = req;
    ctx.res = res;

    request.req = req;
    request.method = req.method || "GET";
    request.url = req.url || "/";
    request.path = url.pathname;
    request.headers = req.headers;
    request.query = searchParamsToObject(url.searchParams);
    request.params = {};
    request.body = await parseRequestBody(req);

    response.res = res;
    response.body = undefined;

    ctx.request = request;
    ctx.response = response;

    ctx.state = Object.create(null);
    ctx.responded = false;

    res.statusCode = 200;

    return ctx;
}
