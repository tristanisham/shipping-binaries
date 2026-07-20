import { Hono } from "hono";
import { About } from "./views/About.js";
import { Home } from "./views/Home.js";

const app = new Hono();

app.get("/", (c) => {
  return c.html(<Home />);
});

app.get("/about", (c) => {
  return c.html(<About />);
});

export default app;
