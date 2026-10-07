/** Formatting helpers shared by every screen. Dates are plain YYYY-MM-DD strings. */

const TIME_ZONE = "Asia/Karachi";

const longDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

const toUtc = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** "12 Oct 2026" */
export const formatDate = (iso: string) => longDate.format(toUtc(iso));

/** "12 Oct" */
export const formatShortDate = (iso: string) => shortDate.format(toUtc(iso));

/** "12h", "6.5h" */
export const formatHours = (hours: number) =>
  `${Number.isInteger(hours) ? hours : Number(hours.toFixed(1))}h`;

/** Today's date in Lahore as YYYY-MM-DD. */
export const todayIso = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());

/** Whole days from today (Lahore) until the date; negative when past. */
export function daysUntil(iso: string) {
  return Math.round((toUtc(iso).getTime() - toUtc(todayIso()).getTime()) / 86_400_000);
}

export type DeadlineTone = "overdue" | "soon" | "upcoming";

export function deadlineTone(iso: string): DeadlineTone {
  const days = daysUntil(iso);
  if (days < 0) return "overdue";
  if (days <= 3) return "soon";
  return "upcoming";
}

/** Tailwind classes for a deadline chip of the given tone. */
export const deadlineToneClass: Record<DeadlineTone, string> = {
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  soon: "bg-warning/15 text-amber-700 border-warning/30 dark:text-amber-300",
  upcoming: "bg-muted text-muted-foreground border-border",
};

/** "Due today", "Due tomorrow", "in 5 days", "3 days overdue" */
export function relativeDeadline(iso: string) {
  const days = daysUntil(iso);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1) return `in ${days} days`;
  if (days === -1) return "1 day overdue";
  return `${-days} days overdue`;
}

const dayInLahore = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});
const dateTimeInLahore = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});
const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** A moment in Lahore time: "7 Oct 2026, 14:05". */
export const formatDateTime = (date: Date) => dateTimeInLahore.format(date);

/** "just now", "5 minutes ago", "yesterday", "3 days ago"; older than a week shows the date. */
export function formatRelativeTime(date: Date, now: number = Date.now()) {
  const minutes = Math.floor((now - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return relativeTime.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return relativeTime.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 7) return relativeTime.format(-days, "day");
  return dayInLahore.format(date);
}

/** "Ayesha Khan" → "AK" */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
}
