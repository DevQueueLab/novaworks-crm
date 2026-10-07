import { formatDate, formatShortDate, todayIso } from "@/lib/format";

/*
 * Chat timestamps render in the company time zone (same as src/lib/format.ts),
 * so the server render and the browser agree and hydration stays stable.
 */
const TIME_ZONE = "Asia/Karachi";

const clockFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: TIME_ZONE,
});
const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });
const fullFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: TIME_ZONE,
});

/** "2:05 PM" */
export const formatTime = (iso: string) => clockFormat.format(new Date(iso));

/** "2:05" for the hover gutter beside follow-up messages. */
export const formatClock = (iso: string) =>
  clockFormat
    .formatToParts(new Date(iso))
    .filter((part) => part.type !== "dayPeriod")
    .map((part) => part.value)
    .join("")
    .trim();

/** "Wednesday 7 October 2026 at 2:05 pm", for tooltips. */
export const formatFullTimestamp = (iso: string) => fullFormat.format(new Date(iso));

/** Calendar day of a timestamp (YYYY-MM-DD). */
export const dayOf = (iso: string) => dayFormat.format(new Date(iso));

const previousDay = (day: string) =>
  new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/** "Today", "Yesterday" or "12 Oct 2026". */
export function dayLabel(day: string, today = todayIso()) {
  if (day === today) return "Today";
  if (day === previousDay(today)) return "Yesterday";
  return formatDate(day);
}

/** Compact last-activity label for the channel list: "2:05 PM", "Yesterday" or "12 Oct". */
export function activityLabel(iso: string, today = todayIso()) {
  const day = dayOf(iso);
  if (day === today) return formatTime(iso);
  if (day === previousDay(today)) return "Yesterday";
  return formatShortDate(day);
}
