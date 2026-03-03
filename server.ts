import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./src/backend/routes/authRoutes.ts";
import userRoutes from "./src/backend/routes/userRoutes.ts";
import cryptoRoutes from "./src/backend/routes/cryptoRoutes.ts";

dotenv.config();

// use an environment variable for the database, fall back to local Mongo
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cryptodash";

// reuse a single Express instance so it can be exported for serverless
const app = express();
app.use(express.json());

// connect to Mongo once when the module is imported
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/crypto", cryptoRoutes);

// Vite middleware for development (skipped on Vercel)
if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
  (async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  })();
} else if (!process.env.VERCEL) {
  // when running a production build locally
  app.use(express.static("dist"));
  app.get("*", (req, res) => {
    res.sendFile("dist/index.html", { root: "." });
  });
}

// start listening only when running the file directly (not on Vercel)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000; // allow override to avoid conflicts
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// exporting the Express app enables Vercel's @vercel/node builder to use it as a handler
export default app;

