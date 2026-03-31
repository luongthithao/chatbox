import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import aiRoutes from "./routes/ai.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import userRoutes from "./routes/user.route.js";
import errorHandler from "./middlewares/errorHandler.js";
import { getEnv } from "./config/env.js";
import AppError from "./utils/AppError.js";

const app = express();
const env = getEnv();

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
  });
});

app.use("/api/users", userRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/conversations", conversationRoutes);

app.use((req, res, next) => {
  next(new AppError("Không tìm thấy tài nguyên", 404));
});

app.use(errorHandler);

export default app;
