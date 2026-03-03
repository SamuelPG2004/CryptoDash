import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./src/backend/routes/authRoutes.js";
import userRoutes from "./src/backend/routes/userRoutes.js";
import cryptoRoutes from "./src/backend/routes/cryptoRoutes.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cryptodash";

const app = express();
app.use(express.json());

// Track connection state across serverless invocations
let isConnected = false;

export const connectToDatabase = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log("Connected to MongoDB successfully");
  } catch (err) {
    isConnected = false;
    console.error("MongoDB connection error:", err);
    throw err; // re-throw so callers know the connection failed
  }
};

// DB middleware — only routes that need MongoDB require a live connection
const requireDB = async (req: any, res: any, next: any) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error("Failed to connect to database:", err);
    res.status(500).json({ message: "No se pudo conectar a la base de datos" });
  }
};

// API routes — crypto does NOT need MongoDB
app.use("/api/auth", requireDB, authRoutes);
app.use("/api/users", requireDB, userRoutes);
app.use("/api/crypto", cryptoRoutes);

// Vite middleware for development (skipped on Vercel)
if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
  (async () => {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error("Failed to start Vite dev server:", err);
    }
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
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
