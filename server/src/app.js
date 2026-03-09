import express from "express";
import cors from "cors";
import aiRoutes from "./routes/ai.routes.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/ai", aiRoutes);

// Error middleware (LUÔN đặt cuối)
app.use(errorHandler);

export default app;