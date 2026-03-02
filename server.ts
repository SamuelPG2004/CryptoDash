import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./src/backend/routes/authRoutes.ts";
import userRoutes from "./src/backend/routes/userRoutes.ts";
import cryptoRoutes from "./src/backend/routes/cryptoRoutes.ts";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cryptodash";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // MongoDB Connection
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB Atlas successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }

  // API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/crypto", cryptoRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
