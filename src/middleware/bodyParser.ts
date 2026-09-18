import type { Middleware } from "../types";
import querystring from "querystring";





export const bodyParser: Middleware = async (ctx, next) => {
  const raw = ctx.request.body;

  if (raw == null) {
    return next();
  }

  const contentType = ctx.get("Content-Type")?.split(";")[0].trim().toLowerCase();

  try {
    switch (contentType) {
      case "application/json": {
        const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);
        ctx.request.body = text.length ? JSON.parse(text) : {};
        break;
      }

      case "application/x-www-form-urlencoded": {
        const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);
        ctx.request.body = querystring.parse(text);
        break;
      }

      case "text/plain": {
        ctx.request.body = Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);
        break;
      }

      case "image/jpeg":
      case "image/png":
      case "image/gif":
      case "image/webp":
      case "application/pdf":
      case "application/octet-stream": {
        ctx.request.body = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
        break;
      }

      default:
        if (contentType?.startsWith("image/")) {
          ctx.request.body = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
        } else {
          ctx.request.body = Buffer.isBuffer(raw) ? raw.toString("utf8") : raw;
        }
        break;
    }
  } catch {
    ctx.throw(400, "Invalid request body");
  }

  await next();
};
