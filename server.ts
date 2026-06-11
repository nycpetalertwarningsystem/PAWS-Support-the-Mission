import express from "express";
import cors from "cors";

const app = express();

const whitelist = [
  "https://petalertwarningsys.com",        // Your Main Application Domain
  "https://api.petalertwarningsys.com",    // Core API Endpoint Gateway
  "https://dashboard.petalertwarningsys.com" // Internal Dispatch Fallback Portal
];

app.use(cors({
  origin: (origin, callback) => {
    // Permit requests with no origin (such as direct server-to-server municipal CAD webhooks)
    if (!origin) return callback(null, true);
    
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.error(`[CORS SECURITY ALERT] Blocked unauthorized domain access: ${origin}`);
      callback(new Error("Not allowed by P.A.W.S. Cyber Security Policy"));
    }
  },
  credentials: true,
  methods: ["POST", "GET", "OPTIONS"]
}));
