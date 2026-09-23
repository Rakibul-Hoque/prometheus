



import type { Context, RequestContext } from "./types";
import { requestPrototype } from "./request";
import { responsePrototype } from "./response";
import { baseContextPrototype } from "./baseContext";
import { searchParamsToObject } from "./utils";

export async function createContext(
  reqCtx: RequestContext,
  app: any
): Promise<Context> {
  const url = new URL(reqCtx.url || "/", `http://${reqCtx.host || "localhost"}`);

  const ctx = Object.create(baseContextPrototype) as Context;
  const request = Object.create(requestPrototype);
  const response = Object.create(responsePrototype);

  ctx.rootApp = app;
  ctx.app = app;
  ctx.appStack = [];
  ctx._responded___ = false;
  ctx._execState = { _isRouteFound___: false, _redirect___: false };
  ctx.state = Object.create(null);

  request.method = reqCtx.method || "GET";
  request.url = reqCtx.url || "/";
  request.path = url.pathname;
  request.headers = reqCtx.headers || {};
  request.remoteAddress = reqCtx.remoteAddress;
  request.query = searchParamsToObject(url.searchParams);
  request.params = {};
  request.body = reqCtx.body;

  response._body = undefined;
  response._statusCode = 200;
  response.headers = new Map();

  ctx.request = request;
  ctx.response = response;

  return ctx;
}