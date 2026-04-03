"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useEffectEvent,
  useState,
} from "react";

type SocialItem = {
  id: string;
  contentUrl: string;
  contentType: string;
  views: number;
  publishedAt: string | null;
};

type MonitoringSection = {
  platform: "youtube" | "instagram" | "tiktok";
  status: "idle" | "loading" | "ready" | "error";
  message: string;
  accountName: string;
  accountHandle: string;
  profileImageUrl: string;
  totalViews: number;
  items: SocialItem[];
};

type MonitoringResponse = {
  targets: {
    youtube: string;
    instagram: string;
    tiktok: string;
  };
  sections: MonitoringSection[];
  contentLimit: number;
  refreshedAt: string;
};

type DashboardClientProps = {
  username: string;
  initialData: MonitoringResponse;
};

type ApiCheckResult = {
  ok: boolean;
  reachable?: boolean;
  endpoint?: string;
  status?: number;
  body?: string;
  message?: string;
  checkedAt?: string;
};

type MonitoringRequestResult =
  | { kind: "ok"; data: MonitoringResponse }
  | { kind: "unauthorized" }
  | { kind: "error" };

const platformLabels: Record<MonitoringSection["platform"], string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
};

const platformOrder: MonitoringSection["platform"][] = ["youtube", "instagram", "tiktok"];
const REFRESH_INTERVAL_SECONDS = 60;

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function avatarLoader({ src }: { src: string }) {
  return src;
}

function hasAnyTargets(targets: MonitoringResponse["targets"]) {
  return platformOrder.some((platform) => targets[platform].trim() !== "");
}

function hasAnyLoadedData(data: MonitoringResponse) {
  return data.sections.some((section) => section.items.length > 0 || section.accountName !== "");
}

function buildLoadingState(
  targets: MonitoringResponse["targets"],
  previousData: MonitoringResponse,
) {
  return {
    ...previousData,
    targets,
    sections: platformOrder.map((platform) => {
      const identifier = targets[platform].trim();
      const previousSection = previousData.sections.find((section) => section.platform === platform);

      if (!identifier) {
        return {
          platform,
          status: "idle" as const,
          message: "Belum ada akun yang disimpan.",
          accountName: "",
          accountHandle: "",
          profileImageUrl: "",
          totalViews: 0,
          items: [],
        };
      }

      return {
        platform,
        status: "loading" as const,
        message: previousSection?.items.length ? "Memperbarui data..." : "Loading data...",
        accountName: previousSection?.accountName || identifier,
        accountHandle:
          previousSection?.accountHandle ||
          (identifier.startsWith("@") ? identifier : `@${identifier}`),
        profileImageUrl: previousSection?.profileImageUrl || "",
        totalViews: previousSection?.totalViews || 0,
        items: previousSection?.items || [],
      };
    }),
  };
}

async function requestMonitoringData(contentLimit: number): Promise<MonitoringRequestResult> {
  const searchParams = new URLSearchParams({
    limit: String(contentLimit),
  });
  const response = await fetch(`/api/monitoring?${searchParams.toString()}`, {
    cache: "no-store",
  });

  if (response.status === 401) {
    return { kind: "unauthorized" };
  }

  if (!response.ok) {
    return { kind: "error" };
  }

  const result = (await response.json()) as MonitoringResponse & { ok: boolean };

  return {
    kind: "ok",
    data: {
      targets: result.targets,
      sections: result.sections,
      contentLimit: result.contentLimit,
      refreshedAt: result.refreshedAt,
    },
  };
}

export function DashboardClient({ username, initialData }: DashboardClientProps) {
  const router = useRouter();
  const [targets, setTargets] = useState(initialData.targets);
  const [data, setData] = useState(initialData);
  const [statusMessage, setStatusMessage] = useState("");
  const [apiCheckMessage, setApiCheckMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingApi, setIsCheckingApi] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [refreshCooldownRemaining, setRefreshCooldownRemaining] = useState(0);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [autoRefreshArmed, setAutoRefreshArmed] = useState(false);

  const handleAutoRefreshTick = useEffectEvent(async () => {
    setIsRefreshing(true);
    setStatusMessage("");

    try {
      await submitTargetsAndRefresh(targets);
      startRefreshCooldown();
    } catch (error) {
      setStatusMessage(
        error instanceof Error && error.message
          ? error.message
          : "Target akun gagal disimpan.",
      );
    } finally {
      window.setTimeout(() => {
        setIsRefreshing(false);
      }, 450);
    }
  });

  useEffect(() => {
    if (refreshCooldownRemaining <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRefreshCooldownRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshCooldownRemaining]);

  useEffect(() => {
    if (
      !autoRefreshEnabled ||
      !autoRefreshArmed ||
      refreshCooldownRemaining > 0 ||
      isRefreshing ||
      isSaving ||
      !hasAnyTargets(targets)
    ) {
      return;
    }

    void handleAutoRefreshTick();
  }, [autoRefreshArmed, autoRefreshEnabled, isRefreshing, isSaving, refreshCooldownRemaining, targets]);

  function startRefreshCooldown() {
    setRefreshCooldownRemaining(REFRESH_INTERVAL_SECONDS);
  }

  function handleAutoRefreshToggle() {
    setAutoRefreshEnabled((current) => {
      const nextValue = !current;

      if (!nextValue) {
        setAutoRefreshArmed(false);
        setRefreshCooldownRemaining(0);
        return nextValue;
      }

      if (hasAnyTargets(targets) && hasAnyLoadedData(data)) {
        setAutoRefreshArmed(true);
        if (refreshCooldownRemaining === 0 && !isRefreshing && !isSaving) {
          startRefreshCooldown();
        }
      }

      return nextValue;
    });
  }

  function handleStopAutoRefresh() {
    setAutoRefreshEnabled(false);
    setAutoRefreshArmed(false);
    setRefreshCooldownRemaining(0);
  }

  async function submitTargetsAndRefresh(payload: MonitoringResponse["targets"]) {
    setStatusMessage("");
    setData((current) => buildLoadingState(payload, current));

    const response = await fetch("/api/monitoring/targets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as
      | ({ message?: string } & Partial<MonitoringResponse>)
      | ({ message?: string });

    if (!response.ok) {
      throw new Error(result.message ?? "Target akun gagal disimpan.");
    }

    if (
      "sections" in result &&
      "contentLimit" in result &&
      "refreshedAt" in result &&
      "targets" in result &&
      result.sections &&
      result.contentLimit &&
      result.refreshedAt &&
      result.targets
    ) {
      setData({
        targets: result.targets,
        sections: result.sections,
        contentLimit: result.contentLimit,
        refreshedAt: result.refreshedAt,
      });
      return;
    }

    await refreshMonitoring(payload, false);
  }

  async function refreshMonitoring(nextTargets = targets, startCooldown = false) {
    setIsRefreshing(true);
    setStatusMessage("");
    setData((current) => buildLoadingState(nextTargets, current));

    try {
      const result = await requestMonitoringData(initialData.contentLimit);

      if (result.kind === "unauthorized") {
        router.replace("/login");
        router.refresh();
        return;
      }

      if (result.kind === "error") {
        setStatusMessage("Data belum bisa diperbarui.");
        return;
      }

      setData(result.data);
      setStatusMessage("");
    } finally {
      window.setTimeout(() => {
        setIsRefreshing(false);
        if (startCooldown) {
          startRefreshCooldown();
        }
      }, 450);
    }
  }

  async function handleSaveTargets(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage("");
    setIsSaving(true);

    try {
      const payload = {
        youtube: targets.youtube,
        instagram: targets.instagram,
        tiktok: targets.tiktok,
      };

      setTargets(payload);
      if (autoRefreshEnabled) {
        setAutoRefreshArmed(true);
      }
      await submitTargetsAndRefresh(payload);
      startRefreshCooldown();
    } catch (error) {
      setStatusMessage(
        error instanceof Error && error.message
          ? error.message
          : "Target akun gagal disimpan.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        setStatusMessage("Logout gagal.");
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setStatusMessage("Logout gagal.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleApiCheck() {
    setIsCheckingApi(true);
    setApiCheckMessage("");

    try {
      const response = await fetch("/api/system/api-check", {
        cache: "no-store",
      });
      const result = (await response.json()) as ApiCheckResult;

      if (response.status === 401) {
        router.replace("/login");
        router.refresh();
        return;
      }

      if (!response.ok) {
        setApiCheckMessage(result.message ?? "API lokal tidak bisa dihubungi.");
        return;
      }

      const bodyPreview = result.body?.trim()
        ? ` | Response: ${result.body.slice(0, 80)}`
        : "";

      setApiCheckMessage(
        `API OK: ${result.endpoint} (${result.status})${bodyPreview}`,
      );
    } catch {
      setApiCheckMessage("API lokal tidak bisa dihubungi.");
    } finally {
      setIsCheckingApi(false);
    }
  }

  async function handleManualRefresh() {
    if (isRefreshing || isSaving || refreshCooldownRemaining > 0) {
      return;
    }

    await refreshMonitoring(targets, true);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-zinc-500">Login aktif</p>
            <h1 className="text-2xl font-semibold text-zinc-950">Media Monitoring</h1>
            <p className="text-sm text-zinc-600">
              User: <span className="font-medium text-zinc-900">{username}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleApiCheck()}
              disabled={isCheckingApi}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-800 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCheckingApi ? "Checking..." : "API Check"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-800 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoggingOut ? "Keluar..." : "Logout"}
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSaveTargets}
          className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_180px_170px]"
        >
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
            YouTube (channel)
            <input
              name="youtube"
              value={targets.youtube}
              disabled={autoRefreshEnabled}
              onChange={(event) =>
                setTargets((current) => ({ ...current, youtube: event.target.value }))
              }
              className="rounded-xl border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
              placeholder="contoh: GoogleDevelopers"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
            Instagram (username)
            <input
              name="instagram"
              value={targets.instagram}
              disabled={autoRefreshEnabled}
              onChange={(event) =>
                setTargets((current) => ({ ...current, instagram: event.target.value }))
              }
              className="rounded-xl border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
              placeholder="contoh: instagram"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
            TikTok (username)
            <input
              name="tiktok"
              value={targets.tiktok}
              disabled={autoRefreshEnabled}
              onChange={(event) =>
                setTargets((current) => ({ ...current, tiktok: event.target.value }))
              }
              className="rounded-xl border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
              placeholder="contoh: tiktok"
            />
          </label>
          <div className="flex min-w-0 flex-col justify-end gap-2">
            <div className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              <span>Refresh otomatis</span>
              <button
                type="button"
                onClick={handleAutoRefreshToggle}
                className={`inline-flex h-12 items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  autoRefreshEnabled
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-800"
                }`}
              >
                <span>{autoRefreshEnabled ? "ON" : "OFF"}</span>
                <span
                  className={`h-5 w-5 rounded-full transition ${
                    autoRefreshEnabled ? "bg-white" : "bg-zinc-300"
                  }`}
                />
              </button>
            </div>
          </div>
          {!autoRefreshEnabled ? (
            <div className="flex min-w-0 flex-col justify-end gap-2">
              <button
                type="button"
                onClick={() => void handleManualRefresh()}
                disabled={isRefreshing || isSaving || refreshCooldownRemaining > 0}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:border-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRefreshing
                  ? "Refreshing..."
                  : refreshCooldownRemaining > 0
                    ? `Refresh ${refreshCooldownRemaining}s`
                    : "Refresh data"}
              </button>
            </div>
          ) : (
            <div className="flex min-w-0 flex-col justify-end gap-2">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleStopAutoRefresh}
                  className="min-h-12 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:border-zinc-800 hover:bg-zinc-50"
                >
                  Stop
                </button>
              </div>
            </div>
          )}
          <button
            type="submit"
            disabled={(autoRefreshEnabled && autoRefreshArmed) || isSaving || isRefreshing || refreshCooldownRemaining > 0}
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400 xl:col-span-5"
          >
            {autoRefreshEnabled && autoRefreshArmed
              ? "Simpan akun & refresh nonaktif saat otomatis ON"
              : isSaving
              ? "Menyimpan..."
              : isRefreshing
                ? "Refreshing..."
                : refreshCooldownRemaining > 0
                  ? `Simpan akun & refresh ${refreshCooldownRemaining}s`
                  : "Simpan akun dan refresh data"}
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-2 text-sm text-zinc-600 md:flex-row md:items-center md:justify-between">
          <p>Refresh terakhir: {formatDate(data.refreshedAt)}</p>
          <p>
            {isRefreshing
              ? "Data sedang diperbarui..."
              : refreshCooldownRemaining > 0
                ? (
                    <>
                      {autoRefreshEnabled ? "Refresh otomatis dalam " : "Baru bisa refresh setelah "}
                      <span className="inline-block animate-pulse font-semibold text-zinc-900">
                        {refreshCooldownRemaining}
                      </span>{" "}
                      detik
                    </>
                  )
                : autoRefreshEnabled
                  ? autoRefreshArmed
                    ? "Refresh otomatis aktif setiap 60 detik"
                    : "Refresh otomatis menunggu simpan akun & refresh pertama"
                  : "Baru bisa refresh setelah 60 detik"}
          </p>
        </div>

        {statusMessage ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {statusMessage}
          </p>
        ) : null}

        {apiCheckMessage ? (
          <p className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            {apiCheckMessage}
          </p>
        ) : null}
      </section>

      <div className={`flex flex-col gap-4 ${isRefreshing ? "animate-data-refresh" : ""}`}>
        {data.sections.map((section) => (
          <section
            key={section.platform}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-4">
                {section.profileImageUrl ? (
                  <Image
                    src={section.profileImageUrl}
                    alt={section.accountName || platformLabels[section.platform]}
                    width={64}
                    height={64}
                    unoptimized
                    loader={avatarLoader}
                    className="h-16 w-16 rounded-full border border-zinc-200 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-zinc-300 text-xs text-zinc-400">
                    No Img
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    {platformLabels[section.platform]}
                  </p>
                  <h2 className="text-xl font-semibold text-zinc-950">
                    {section.accountName || "Belum ada akun"}
                  </h2>
                  <p className="text-sm text-zinc-600">
                    {section.accountHandle || "Masukkan akun lalu simpan untuk mulai fetch data."}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-left lg:min-w-52">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Total Views</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-950">
                  {section.status === "loading" ? "Loading..." : formatNumber(section.totalViews)}
                </p>
              </div>
            </div>

            {section.status === "ready" || (section.status === "loading" && section.items.length > 0) ? (
              <div className="mt-4 overflow-x-auto">
                <div className="relative">
                  {section.status === "loading" ? (
                    <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end p-3">
                      <span className="rounded-full border border-zinc-200 bg-white/90 px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm">
                        Memperbarui data...
                      </span>
                    </div>
                  ) : null}
                  <table
                    className={`w-full min-w-[560px] border-separate border-spacing-0 rounded-xl border border-zinc-200 text-left transition-opacity ${
                      section.status === "loading" ? "opacity-60" : "opacity-100"
                    }`}
                  >
                  <thead className="bg-zinc-100 text-xs uppercase tracking-[0.18em] text-zinc-500">
                    <tr>
                      <th className="px-4 py-3">Link Content</th>
                      <th className="px-4 py-3 text-right">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item) => (
                      <tr key={item.id} className="border-t border-zinc-200">
                        <td className="px-4 py-3 text-sm text-zinc-900">
                          <a
                            href={item.contentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:border-zinc-800 hover:bg-zinc-50"
                          >
                            Link Content
                          </a>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-zinc-900">
                          {formatNumber(item.views)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
                {section.message}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
