const rawAllowedOrigins = [
  "https://frontend-lo6d.vercel.app",
  process.env.FRONTEND_URL,

  // React / Vite
  "http://localhost:5173",
  "http://127.0.0.1:5173",

  // Other web development ports
  "http://localhost:3000",
  "http://127.0.0.1:3000",

  // Expo web
  "http://localhost:8081",
  "http://127.0.0.1:8081",
];

export const allowedOrigins = rawAllowedOrigins
  .filter(Boolean)
  .map((url) => url.replace(/\/$/, ""));

export const isOriginAllowed = (origin) => {
  // Mobile apps, Postman, curl, server-to-server requests may have no Origin header
  if (!origin) {
    return true;
  }

  const cleanOrigin = origin.replace(/\/$/, "");

  if (allowedOrigins.includes(cleanOrigin)) {
    return true;
  }

  // Allow FixMate Vercel preview and production deployments
  if (/^https:\/\/frontend-[a-z0-9]+-[a-z0-9-]+\.vercel\.app$/.test(cleanOrigin)) {
    return true;
  }
  if (/^https:\/\/frontend-[a-z0-9]+\.vercel\.app$/.test(cleanOrigin)) {
    return true;
  }

  return false;
};

export const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }

    console.warn(`❌ CORS blocked: ${origin}`);
    return callback(new Error(`CORS origin denied: ${origin}`));
  },

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
    "Origin",
  ],

  credentials: true,

  optionsSuccessStatus: 200,
};
