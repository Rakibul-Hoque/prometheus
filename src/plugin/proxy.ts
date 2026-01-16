import http from "http";
import https from "https";
import { URL } from "url";

function proxyRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    target: string
) {
    const url = new URL(target);

    const client = url.protocol === "https:" ? https : http;

    const proxyReq = client.request(
        {
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port,
            method: req.method,
            path: req.url,
            headers: req.headers
        },
        proxyRes => {
            res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
            proxyRes.pipe(res);
        }
    );

    proxyReq.on("error", err => {
        res.statusCode = 502;
        res.end("Bad Gateway");
    });

    req.pipe(proxyReq);
}



export function proxy(target: string): Middleware {
    return async (ctx) => {
        proxyRequest(ctx.req, ctx.res, target);
        ctx.respond = false; // IMPORTANT: prevent normal response
    };
}