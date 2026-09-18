import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import { fileNameToMimeType } from "../mime";
import type { Context, Next, App, Plugin } from "../types";


async function findFileRecursively(rootDir: string, targetName: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(rootDir, entry.name);

      if (entry.isDirectory()) {
        const found = await findFileRecursively(fullPath, targetName);
        if (found) return found;
      } else if (entry.isFile() && entry.name === targetName) {
        return fullPath;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function serveStatic(StaticDir: string): Plugin {
  const absoluteStaticDir = path.resolve(StaticDir);

  return async <T>(app: App, Opts: T) => {
    app.use(async (ctx: Context, next: Next) => {
      if (ctx.method !== "GET" && ctx.method !== "HEAD") {
        return next();
      }

      const prefix = app.prefix || "";
      let relativePath = ctx.path;
      if (prefix && relativePath.startsWith(prefix)) {
        relativePath = relativePath.slice(prefix.length);
      }


      relativePath = decodeURIComponent(relativePath.replace(/^\/+/, ""));


      const directFilePath = path.resolve(absoluteStaticDir, relativePath);
      if (!directFilePath.startsWith(absoluteStaticDir)) {
        return next();
      }

      let targetFilePath: string | null = null;

      try {
        const stat = await fs.stat(directFilePath);
        if (stat.isFile()) {
          targetFilePath = directFilePath;
        } else if (stat.isDirectory()) {
          const indexPath = path.join(directFilePath, "index.html");
          const indexStat = await fs.stat(indexPath).catch(() => null);
          if (indexStat && indexStat.isFile()) {
            targetFilePath = indexPath;
          }
        }
      } catch {

      }

      if (!targetFilePath && relativePath) {
        const resourceName = path.basename(relativePath);
        targetFilePath = await findFileRecursively(absoluteStaticDir, resourceName);
      }

      if (!targetFilePath) {
        return next();
      }

      const fileStat = await fs.stat(targetFilePath);
      ctx.set({"Content-Type": fileNameToMimeType(targetFilePath) || "application/octet-stream",
      "Content-Length": fileStat.size.toString(),
     "Last-Modified": fileStat.mtime.toUTCString(),
     "Cache-Control": "public, max-age=86400"})
 
      const stream = createReadStream(targetFilePath);
      ctx.send(stream, 200);
    });
  };
}
