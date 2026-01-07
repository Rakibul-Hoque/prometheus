import App from "./src";

const app = new App({
    logger: true
});



/* ──────────────────────────────
   GLOBAL MIDDLEWARE
────────────────────────────── */

app.use(async (ctx, next) => {
    console.log("🌍 Global middleware start");
    await next();
    console.log("🌍 Global middleware end");
});

/* ──────────────────────────────
   ROOT ROUTES
────────────────────────────── */

app.get("/", async ctx => {
    console.log("🏠 Home route");
    ctx.body = "Home page";
});

app.get("/query", async ctx => {
    console.log("🔍 Query route");
    ctx.body = {
        name: ctx.query.get("name"),
        age: ctx.query.get("age")
    };
});

app.post("/json", async ctx => {
    console.log("📦 JSON body route");
    ctx.body = {
        received: ctx.request.body
    };
});

app.post("/form", async ctx => {
    console.log("📝 Form body route");
    ctx.body = ctx.request.body;
});

/* ──────────────────────────────
   PLUGIN: /user
────────────────────────────── */

app.register(user => {
    user.use(async (ctx, next) => {
        console.log("👤 User plugin middleware start");
        await next();
        console.log("👤 User plugin middleware end");
    });

    user.get("/:id", async ctx => {
        console.log("👤 User dynamic route");
        ctx.body = {
            id: ctx.params?.id,
            query: Object.fromEntries(ctx.query)
        };
    });

    user.post("/:id", async ctx => {
        console.log("👤 User POST route");
        ctx.body = {
            id: ctx.params?.id,
            body: ctx.request.body
        };
    });

    user.get("/redirect/me", async ctx => {
        console.log("➡️ Redirect route");
        ctx.redirect("/");
    });

    user.get("/error", async ctx => {
        console.log("💥 Error route");
        ctx.throw(400, "User error");
    });

    user.register(admin => {
        admin.use(async (ctx, next) => {
            console.log("admin plugin middleware start");
            await next();
        });

        admin.get("/:id", async ctx => {
            console.log("admin dynamic route");
            ctx.body = {
                id: ctx.params?.id,
                query: Object.fromEntries(ctx.query)
            };
        });
    }, "/admin");
}, "/user");

/* ──────────────────────────────
   GLOBAL MIDDLEWARE AFTER PLUGIN
────────────────────────────── */

app.use(async (ctx, next) => {
    console.log("🌍 Final global middleware");
    await next();
});

/* ──────────────────────────────
   START SERVER
────────────────────────────── */

app.listen(3000);
console.log("🚀 Server running at http://localhost:3000");
