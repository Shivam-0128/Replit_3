export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!err) return fallback;
  const e = err as { data?: unknown; message?: string };
  const d = e.data as Record<string, unknown> | null | undefined;
  if (d && typeof d === "object") {
    for (const k of ["error", "message", "detail"]) {
      if (typeof d[k] === "string" && d[k]) return d[k] as string;
    }
  }
  return e.message || fallback;
}

export function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function lastSevenDays(): { date: string; weekday: string; isToday: boolean }[] {
  const out = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    out.push({ date: localDateString(d), weekday: d.toLocaleDateString(undefined, { weekday: "short" }), isToday: i === 0 });
  }
  return out;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}
