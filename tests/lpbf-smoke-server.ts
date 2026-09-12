/** Isolated UI/API smoke host; does not start unrelated physics services. */
import express from "express";
import { createServer } from "vite";
import { lpbfSimulationRouter } from "../routes/lpbfSimulation";

const app = express();
app.use(express.json({ limit: "500kb" }));
app.use(lpbfSimulationRouter);
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "spa" });
app.use(vite.middlewares);
app.listen(3001, "127.0.0.1", () => console.log("LPBF smoke host: http://127.0.0.1:3001"));
