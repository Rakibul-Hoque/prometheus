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
    return new Promise((resolve, reject) => {
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
            proxyRes.on("end", resolve);
            proxyRes.on("error", reject);
        });
        proxyReq.on("error", reject);
        req.pipe(proxyReq);
    });
}
function proxy(target) {
    return async (ctx) => {
        try {
            await proxyRequest(ctx.req, ctx.res, target);
            ctx._execState._proxy___ = true;
        }
        catch (err) {
            if (!ctx.res.headersSent) {
                ctx.res.statusCode = 502;
                ctx.res.end("Bad Gateway");
            }
        }
    };
}
