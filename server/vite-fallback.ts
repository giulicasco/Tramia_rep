import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Fallback Vite setup when Vite is not available
export async function setupVite(app: Express, server: Server) {
  log("⚠️  Vite not available, using fallback static file serving", "fallback");
  
  // Try to serve static files if they exist
  const publicPath = path.resolve(import.meta.dirname, "..", "dist", "public");
  const clientPath = path.resolve(import.meta.dirname, "..", "client");
  
  if (fs.existsSync(publicPath)) {
    log("📁 Serving built static files from dist/public", "fallback");
    app.use(express.static(publicPath));
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(publicPath, "index.html"));
    });
  } else if (fs.existsSync(clientPath)) {
    log("📁 Serving client files directly (development fallback)", "fallback");
    app.use(express.static(clientPath));
    app.use("*", (_req, res) => {
      const indexPath = path.resolve(clientPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Development server not properly configured - Vite required");
      }
    });
  } else {
    log("❌ No client files found, serving minimal response", "fallback");
    app.use("*", (_req, res) => {
      res.status(503).send(`
        <html>
          <body>
            <h1>Development Server</h1>
            <p>Vite development server is not available. Please install dependencies properly.</p>
            <p>Missing packages: vite, tsx</p>
          </body>
        </html>
      `);
    });
  }
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}