export type MeteredPeriod = "day" | "month";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function getPeriodStartUtcDateString(period: MeteredPeriod, now: Date = new Date()): string {
  if (period === "month") {
    return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-01`;
  }
  return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`;
}

export function getPeriodResetAtUtcIso(period: MeteredPeriod, now: Date = new Date()): string {
  if (period === "month") {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    return new Date(Date.UTC(nextYear, nextMonth, 1, 0, 0, 0, 0)).toISOString();
  }
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0),
  ).toISOString();
}
