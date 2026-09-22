"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serveStatic = serveStatic;
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const mime_1 = require("../mime");
async function findFileRecursively(rootDir, targetName) {
    try {
        const entries = await promises_1.default.readdir(rootDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path_1.default.join(rootDir, entry.name);
            if (entry.isDirectory()) {
                const found = await findFileRecursively(fullPath, targetName);
                if (found)
                    return found;
            }
            else if (entry.isFile() && entry.name === targetName) {
                return fullPath;
            }
        }
    }
    catch {
        return null;
    }
    return null;
}
function serveStatic(StaticDir) {
    const absoluteStaticDir = path_1.default.resolve(StaticDir);
    return async (app, Opts) => {
        app.use(async (ctx, next) => {
            if (ctx.method !== "GET" && ctx.method !== "HEAD") {
                return next();
            }
            const prefix = app.prefix || "";
            let relativePath = ctx.path;
            if (prefix && relativePath.startsWith(prefix)) {
                relativePath = relativePath.slice(prefix.length);
            }
            relativePath = decodeURIComponent(relativePath.replace(/^\/+/, ""));
            const directFilePath = path_1.default.resolve(absoluteStaticDir, relativePath);
            if (!directFilePath.startsWith(absoluteStaticDir)) {
                return next();
            }
            let targetFilePath = null;
            try {
                const stat = await promises_1.default.stat(directFilePath);
                if (stat.isFile()) {
                    targetFilePath = directFilePath;
                }
                else if (stat.isDirectory()) {
                    const indexPath = path_1.default.join(directFilePath, "index.html");
                    const indexStat = await promises_1.default.stat(indexPath).catch(() => null);
                    if (indexStat && indexStat.isFile()) {
                        targetFilePath = indexPath;
                    }
                }
            }
            catch {
            }
            if (!targetFilePath && relativePath) {
                const resourceName = path_1.default.basename(relativePath);
                targetFilePath = await findFileRecursively(absoluteStaticDir, resourceName);
            }
            if (!targetFilePath) {
                return next();
            }
            const fileStat = await promises_1.default.stat(targetFilePath);
            ctx.set({ "Content-Type": (0, mime_1.fileNameToMimeType)(targetFilePath) || "application/octet-stream",
                "Content-Length": fileStat.size.toString(),
                "Last-Modified": fileStat.mtime.toUTCString(),
                "Cache-Control": "public, max-age=86400" });
            const stream = (0, fs_1.createReadStream)(targetFilePath);
            ctx.send(stream, 200);
        });
    };
}
