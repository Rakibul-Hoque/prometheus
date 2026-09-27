"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxy = proxy;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const url_1 = require("url");
function proxyRequest(req, res, target) {
    const url = new url_1.URL(target);
    const client = url.protocol === "https:" ? https_1.default : http_1.default;
    const proxyReq = client.request({
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        method: req.method,
        path: req.url,
        headers: req.headers
    }, proxyRes => {
        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(res);
    });
    proxyReq.on("error", err => {
        res.statusCode = 502;
        res.end("Bad Gateway");
    });
    req.pipe(proxyReq);
}
function proxy(target) {
    return async (ctx) => {
        proxyRequest(ctx.req, ctx.res, target);
        ctx._respond___ = false;
    };
}
