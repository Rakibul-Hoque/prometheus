import http from "http";
import https from "https";
import { URL } from "url";

function proxyRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    target: string
): Promise<void> {
    return new Promise((resolve, reject) => {
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

                proxyRes.on("end", resolve);
                proxyRes.on("error", reject);
            }
        );

        proxyReq.on("error", reject);

        req.pipe(proxyReq);
    });
}

export function proxy(target: string): Middleware {
    return async ctx => {
        try {
            await proxyRequest(ctx.req, ctx.res, target);
            ctx._execState._proxy___ = true;
        } catch (err) {
            if (!ctx.res.headersSent) {
                ctx.res.statusCode = 502;
                ctx.res.end("Bad Gateway");
            }
        }
    };
}
