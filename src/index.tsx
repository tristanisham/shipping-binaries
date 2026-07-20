import { Hono } from "hono";
import { Layout } from "./views/layouts/MainLayout.js";
import { Home } from "./views/Home.js";

const app = new Hono();

app.get("/", (c) => {
  return c.html(<Home />);
});

export default app;
