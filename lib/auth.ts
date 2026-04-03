import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE_NAME = "media-monitoring-session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12;

type SessionPayload = {
  sessionId: string;
  username: string;
  expiresAt: number;
};

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function signValue(value: string) {
  const secret = requireEnv("APP_SESSION_SECRET");

  return createHmac("sha256", secret).update(value).digest("hex");
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, expectedHash] = storedHash.split(":");

  if (!salt || !expectedHash) {
    return false;
  }

  const actualHash = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (actualHash.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualHash, expectedBuffer);
}

export function isValidLogin(username: string, password: string) {
  const expectedUsername = requireEnv("APP_LOGIN_USERNAME");
  const passwordHash = requireEnv("APP_LOGIN_PASSWORD_HASH");

  return username === expectedUsername && verifyPassword(password, passwordHash);
}

export function createSessionCookieValue(username: string) {
  const payload: SessionPayload = {
    sessionId: randomBytes(18).toString("hex"),
    username,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signValue(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function parseSessionCookieValue(cookieValue?: string | null): SessionPayload | null {
  if (!cookieValue) {
    return null;
  }

  const [encodedPayload, signature] = cookieValue.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload);

  if (signature.length !== expectedSignature.length) {
    return null;
  }

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (!payload.sessionId || !payload.username || payload.expiresAt < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  const secure = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    expires: new Date(Date.now() + SESSION_DURATION_MS),
  };
}
