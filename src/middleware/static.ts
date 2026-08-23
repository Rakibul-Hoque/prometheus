import fs from "fs";
import path from "path";
import { getMimeType } from "../mime";
import type { Context, Next } from "../types";

export function serveStatic(root: string) {
    return async (ctx: Context, next: Next) => {
        const filePath = path.join(root, ctx.path);

        if (!fs.existsSync(filePath)) {
            return next();
        }

        const stat = fs.statSync(filePath);
        if (!stat.isFile()) return next();

        ctx.type = getMimeType(filePath) || "application/octet-stream";
        ctx.body = fs.createReadStream(filePath); 
        ctx.end()
    };
}
