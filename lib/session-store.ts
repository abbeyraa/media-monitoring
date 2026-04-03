import { parseSessionCookieValue } from "@/lib/auth";

export type MonitoringTargets = {
  youtube: string;
  instagram: string;
  tiktok: string;
};

type SessionEntry = {
  username: string;
  expiresAt: number;
  targets: MonitoringTargets;
};

const defaultTargets: MonitoringTargets = {
  youtube: "",
  instagram: "",
  tiktok: "",
};

const sessionStore = new Map<string, SessionEntry>();

function cleanupExpiredSessions() {
  const now = Date.now();

  for (const [sessionId, entry] of sessionStore.entries()) {
    if (entry.expiresAt < now) {
      sessionStore.delete(sessionId);
    }
  }
}

export function hydrateSessionFromCookie(cookieValue?: string | null) {
  cleanupExpiredSessions();
  const payload = parseSessionCookieValue(cookieValue);

  if (!payload) {
    return null;
  }

  const existing = sessionStore.get(payload.sessionId);

  if (!existing) {
    sessionStore.set(payload.sessionId, {
      username: payload.username,
      expiresAt: payload.expiresAt,
      targets: { ...defaultTargets },
    });
  } else {
    existing.expiresAt = payload.expiresAt;
    existing.username = payload.username;
  }

  return payload;
}

export function clearSession(sessionId: string) {
  sessionStore.delete(sessionId);
}

export function getTargets(sessionId: string) {
  cleanupExpiredSessions();

  return sessionStore.get(sessionId)?.targets ?? { ...defaultTargets };
}

export function setTargets(sessionId: string, targets: MonitoringTargets) {
  cleanupExpiredSessions();
  const entry = sessionStore.get(sessionId);

  if (!entry) {
    return null;
  }

  entry.targets = targets;

  return entry.targets;
}
