import { describe, expect, it } from "vitest";

import { isRunning, parseSprintKey, postingLinks, sprintKey, spotsOpen, statusFromCount } from "@/lib/sprint-core";
import { formatCents, saleEndDay, saleFromDiscount, saleLine, salePriceCents } from "@/lib/payments/sale-core";
import { PLAN_GOAL_USD, WEEKLY_TARGETS, planStatus } from "@/lib/revenue-plan";
import { buildFunnelReport } from "@/lib/attribution-core";

describe("Application Sprint", () => {
  const now = new Date("2026-10-20T12:00:00Z");

  it("round-trips its storage key", () => {
    const key = sprintKey("2026-10-15", "ord_1", "user_1");
    expect(parseSprintKey(key, 2)).toEqual({ day: "2026-10-15", orderId: "ord_1", userId: "user_1", status: "intake" });
    expect(parseSprintKey("sprint:capacity", 4)).toBeNull();
    expect(statusFromCount(1)).toBe("paid");
    expect(statusFromCount(3)).toBe("delivered");
  });

  it("counts only Sprints still running against the spots", () => {
    const rows = [
      parseSprintKey(sprintKey("2026-10-18", "a", "u1"), 1)!,
      parseSprintKey(sprintKey("2026-10-10", "b", "u2"), 2)!,
      parseSprintKey(sprintKey("2026-10-12", "c", "u3"), 3)!, // delivered
      parseSprintKey(sprintKey("2026-09-20", "d", "u4"), 2)!, // over 21 days ago
    ];
    expect(rows.map((r) => isRunning(r, now))).toEqual([true, true, false, false]);
    expect(spotsOpen(4, rows, now)).toBe(2);
    expect(spotsOpen(1, rows, now)).toBe(0);
  });

  it("keeps up to five posting links", () => {
    const text = "https://a.com/job/1\nnot a link\nhttps://b.com/2 https://a.com/job/1\nhttp://c.io/3 https://d.dev/4 https://e.co/5 https://f.org/6";
    expect(postingLinks(text)).toEqual(["https://a.com/job/1", "https://b.com/2", "http://c.io/3", "https://d.dev/4", "https://e.co/5"]);
  });
});

describe("sale", () => {
  const now = new Date("2026-11-28T10:00:00Z");
  const window = { startsAt: "2026-11-27T00:00:00Z", endsAt: "2026-12-01T00:00:00Z" };

  it("is live only between its start and end", () => {
    const d = { id: "disc", basisPoints: 3400, ...window };
    expect(saleFromDiscount(d, { name: "Black Friday" }, now)?.plan).toBe("yearly");
    expect(saleFromDiscount(d, {}, new Date("2026-11-26T23:00:00Z"))).toBeNull();
    expect(saleFromDiscount(d, {}, new Date("2026-12-01T00:00:00Z"))).toBeNull();
  });

  it("refuses a sale with no end date", () => {
    expect(saleFromDiscount({ id: "disc", basisPoints: 3400, endsAt: null }, {}, now)).toBeNull();
  });

  it("prices percentage and fixed discounts, rounding down", () => {
    const pct = saleFromDiscount({ id: "d", basisPoints: 3400, ...window }, {}, now)!;
    expect(salePriceCents(149.99, pct)).toBe(9899);
    const fixed = saleFromDiscount({ id: "d", amounts: { usd: 5099 }, amount: 5099, ...window }, { plan: "yearly" }, now)!;
    expect(fixed.amountOffCents).toBe(5099);
    expect(formatCents(salePriceCents(149.99, fixed))).toBe("$99.00");
  });

  it("says when it ends, honestly", () => {
    const sale = saleFromDiscount({ id: "d", amounts: { usd: 5099 }, ...window }, { name: "Black Friday" }, now)!;
    expect(saleEndDay(sale.endsAt)).toBe("Mon 30 Nov");
    expect(saleLine(sale, { name: "Yearly Pass", priceUsd: 149.99, price: "$149.99" })).toBe(
      "Black Friday: the Yearly Pass is $99.00 (usually $149.99) until Mon 30 Nov",
    );
  });
});

describe("the $10,000 plan", () => {
  it("ends at the goal and only ever goes up", () => {
    expect(WEEKLY_TARGETS.at(-1)!.usd).toBeGreaterThanOrEqual(PLAN_GOAL_USD);
    for (let i = 1; i < WEEKLY_TARGETS.length; i++) expect(WEEKLY_TARGETS[i].usd).toBeGreaterThan(WEEKLY_TARGETS[i - 1].usd);
  });

  it("says where we should be today and whether we're ahead", () => {
    const end = planStatus(145_000, new Date("2026-11-01T23:00:00Z"));
    expect(end.week?.week).toBe(5);
    expect(end.targetTodayUsd).toBeGreaterThan(1_400);
    expect(end.aheadUsd).toBeGreaterThanOrEqual(-50);
    const behind = planStatus(0, new Date("2026-10-11T12:00:00Z"));
    expect(behind.aheadUsd).toBeLessThan(0);
    expect(planStatus(0, new Date("2026-09-01T00:00:00Z")).week).toBeNull();
    expect(planStatus(1_000_000, new Date("2027-01-05T00:00:00Z")).goalPct).toBe(100);
  });
});

describe("funnel report", () => {
  it("ignores refund rows instead of inventing a channel for them", () => {
    const report = buildFunnelReport(
      [
        { key: "funnel:paid:2026-10-02:reddit:none:ord1", count: 4999 },
        { key: "funnel:refund:2026-10-02:ord1", count: 4999 },
      ],
      30,
      new Date("2026-10-05T00:00:00Z"),
    );
    expect(report.rows.map((r) => r.channel)).toEqual(["reddit"]);
  });
});
