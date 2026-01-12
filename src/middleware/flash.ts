import type { Context, Next, Middleware } from "../types";

const FLASH_COOKIE = "__flash";

export function flash(): Middleware {
    return async (ctx: Context, next: Next) => {
        const cookie = ctx.headers.cookie || "";
        const flashData: Record<string, string> = {};

        // Parse cookie
        for (const part of cookie.split(";")) {
            const [k, v] = part.trim().split("=");
            if (k === FLASH_COOKIE && v) {
                try {
                    Object.assign(flashData, JSON.parse(decodeURIComponent(v)));
                } catch {}
            }
        }


        ctx.flash = (key: string, value?: string) => {
            if (value === undefined) {
                return flashData[key];
            }
            flashData[key] = value;
        };

        await next();


        if (Object.keys(flashData).length > 0) {
            ctx.set(
                "Set-Cookie",
                `${FLASH_COOKIE}=${encodeURIComponent(
                    JSON.stringify(flashData)
                )}; Path=/; HttpOnly`
            );
        } else {
            ctx.set("Set-Cookie", `${FLASH_COOKIE}=; Path=/; Max-Age=0`);
        }
    };
}
