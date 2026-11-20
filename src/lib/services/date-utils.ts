/**
 * Date Filtering & Period Comparison Utilities
 * Accurately calculates current and previous reporting windows and delta statistics.
 */

import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  startOfYear,
  endOfYear,
  subYears,
  differenceInDays,
  subDays,
  startOfDay,
  endOfDay,
} from "date-fns";

export type PeriodType =
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "all_time"
  | "custom";

export interface PeriodRange {
  start: Date;
  end: Date;
}

export interface PeriodComparison {
  current: PeriodRange;
  previous: PeriodRange;
  label: string;
}

export function getPeriodRange(
  period: PeriodType = "this_month",
  customStart?: string | null,
  customEnd?: string | null
): PeriodComparison {
  const now = new Date();

  switch (period) {
    case "this_week": {
      const curStart = startOfWeek(now, { weekStartsOn: 1 });
      const curEnd = endOfWeek(now, { weekStartsOn: 1 });
      const prevWeekNow = subWeeks(now, 1);
      const prevStart = startOfWeek(prevWeekNow, { weekStartsOn: 1 });
      const prevEnd = endOfWeek(prevWeekNow, { weekStartsOn: 1 });
      return {
        current: { start: curStart, end: curEnd },
        previous: { start: prevStart, end: prevEnd },
        label: "vs last week",
      };
    }

    case "last_week": {
      const lastWeekNow = subWeeks(now, 1);
      const curStart = startOfWeek(lastWeekNow, { weekStartsOn: 1 });
      const curEnd = endOfWeek(lastWeekNow, { weekStartsOn: 1 });
      const twoWeeksAgo = subWeeks(now, 2);
      const prevStart = startOfWeek(twoWeeksAgo, { weekStartsOn: 1 });
      const prevEnd = endOfWeek(twoWeeksAgo, { weekStartsOn: 1 });
      return {
        current: { start: curStart, end: curEnd },
        previous: { start: prevStart, end: prevEnd },
        label: "vs prior week",
      };
    }

    case "this_month": {
      const curStart = startOfMonth(now);
      const curEnd = endOfMonth(now);
      const lastMonthNow = subMonths(now, 1);
      const prevStart = startOfMonth(lastMonthNow);
      const prevEnd = endOfMonth(lastMonthNow);
      return {
        current: { start: curStart, end: curEnd },
        previous: { start: prevStart, end: prevEnd },
        label: "vs last month",
      };
    }

    case "last_month": {
      const lastMonthNow = subMonths(now, 1);
      const curStart = startOfMonth(lastMonthNow);
      const curEnd = endOfMonth(lastMonthNow);
      const twoMonthsAgo = subMonths(now, 2);
      const prevStart = startOfMonth(twoMonthsAgo);
      const prevEnd = endOfMonth(twoMonthsAgo);
      return {
        current: { start: curStart, end: curEnd },
        previous: { start: prevStart, end: prevEnd },
        label: "vs prior month",
      };
    }

    case "this_quarter": {
      const curStart = startOfQuarter(now);
      const curEnd = endOfQuarter(now);
      const lastQuarterNow = subQuarters(now, 1);
      const prevStart = startOfQuarter(lastQuarterNow);
      const prevEnd = endOfQuarter(lastQuarterNow);
      return {
        current: { start: curStart, end: curEnd },
        previous: { start: prevStart, end: prevEnd },
        label: "vs last quarter",
      };
    }

    case "this_year": {
      const curStart = startOfYear(now);
      const curEnd = endOfYear(now);
      const lastYearNow = subYears(now, 1);
      const prevStart = startOfYear(lastYearNow);
      const prevEnd = endOfYear(lastYearNow);
      return {
        current: { start: curStart, end: curEnd },
        previous: { start: prevStart, end: prevEnd },
        label: "vs last year",
      };
    }

    case "all_time": {
      const curStart = new Date("2020-01-01T00:00:00.000Z");
      const curEnd = endOfMonth(now);
      return {
        current: { start: curStart, end: curEnd },
        previous: { start: curStart, end: curEnd },
        label: "all time",
      };
    }

    case "custom": {
      let curStart: Date;
      let curEnd: Date;
      if (customStart) {
        const s = new Date(customStart);
        curStart = isNaN(s.getTime()) ? startOfMonth(now) : startOfDay(s);
      } else {
        curStart = startOfMonth(now);
      }

      if (customEnd) {
        const e = new Date(customEnd);
        curEnd = isNaN(e.getTime()) ? endOfMonth(now) : endOfDay(e);
      } else {
        curEnd = endOfMonth(now);
      }

      if (curEnd < curStart) {
        const tmp = curStart;
        curStart = curEnd;
        curEnd = tmp;
      }

      const days = Math.max(1, differenceInDays(curEnd, curStart) + 1);
      const prevEnd = subDays(curStart, 1);
      const prevStart = subDays(prevEnd, days - 1);
      return {
        current: { start: curStart, end: curEnd },
        previous: { start: prevStart, end: prevEnd },
        label: `vs prior ${days} days`,
      };
    }

    default: {
      const curStart = startOfMonth(now);
      const curEnd = endOfMonth(now);
      const prevStart = startOfMonth(subMonths(now, 1));
      const prevEnd = endOfMonth(subMonths(now, 1));
      return {
        current: { start: curStart, end: curEnd },
        previous: { start: prevStart, end: prevEnd },
        label: "vs last month",
      };
    }
  }
}

export interface MetricDelta {
  current: number;
  previous: number;
  diff: number;
  percentageChange: number;
  isPositive: boolean; // True if good (respects inverse metrics like lost quotations)
  trend: "up" | "down" | "neutral";
}

export function calculateDelta(
  current: number,
  previous: number,
  isInverseMetric = false
): MetricDelta {
  const diff = current - previous;
  let percentageChange = 0;

  if (previous !== 0) {
    percentageChange = (diff / Math.abs(previous)) * 100;
  } else if (current > 0) {
    percentageChange = 100;
  }

  // Determine if this change is good/favorable
  let isPositive = diff > 0;
  if (isInverseMetric) {
    isPositive = diff < 0; // For lost orders, fewer is better!
  }

  const trend: "up" | "down" | "neutral" =
    diff > 0 ? "up" : diff < 0 ? "down" : "neutral";

  return {
    current,
    previous,
    diff,
    percentageChange: Number(percentageChange.toFixed(1)),
    isPositive,
    trend,
  };
}
