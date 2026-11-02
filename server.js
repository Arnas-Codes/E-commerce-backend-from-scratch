import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import https from "https";
import fs from "fs";

try {
  await connectDB();
  console.log("MongoDB connected");
} catch (error) {
  console.error("Startup failed:", error.message);
  process.exit(1);
}

void connectRedis();

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === "production") {
  app.listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
  });
} else {
  const options = {
    key: fs.readFileSync("./cert/private-key.pem"),
    cert: fs.readFileSync("./cert/certificate.pem"),
  };

  https.createServer(options, app).listen(PORT, () => {
    console.log(`HTTPS server running on port ${PORT}`);
  });
}
