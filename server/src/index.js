import app from "./app.js";
import aiRoutes from "./routes/ai.routes.js";

const PORT = 5000;

app.use("/api", aiRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
