import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/db/pool";
import { AdminClientActions } from "./client-actions";
import { Users, Crown, Map, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BUSINESS } from "@/lib/business";
import { getRefundStatus } from "@/lib/payments/refund-window";
import { getFunnelReport, getRevenueSince } from "@/lib/attribution";
import { offerSales } from "@/lib/payments/offer-orders";
import { OFFERS, OFFER_KEYS } from "@/lib/payments/offers";
import { listSeatGroups, seatUsageReport } from "@/lib/payments/seat-codes";
import { seatReportText } from "@/lib/payments/seat-report-core";
import { isGroupCode } from "@/lib/payments/seat-codes-core";
import { PLAN_CHECKPOINT, PLAN_GOAL_USD, PLAN_START, planStatus } from "@/lib/revenue-plan";
import { getSprintSpots, listSprints } from "@/lib/sprint";
import { listPartners } from "@/lib/partners";
import { PARTNER_PERCENT, partnerSource } from "@/lib/partners-core";
import { SPRINT_STATUS_LABEL } from "@/lib/sprint-core";
import { PRO_SOURCE_ORDER, PRO_SOURCE_TITLE, proSource, type ProSourceKind } from "@/lib/pro-source";
import { createSeatCodeAction, markSprintDeliveredAction, setSprintCapacityAction } from "./actions";
import { OutboxForm } from "./outbox-form";
import { recentOutreach } from "@/lib/outreach";
import { OUTREACH_DAILY_CAP, addressLooksComplete } from "@/lib/outreach-core";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Next 15+ hands searchParams over as a Promise. Reading .key off the
  // Promise itself gave undefined, so this page 404'd for everyone.
  const searchParams = await searchParamsPromise;
  // 1. Double Security Check (Secret Key + Admin Email)
  const key = searchParams.key;
  if (key !== process.env.ADMIN_SECRET) return notFound();

  const user = await getCurrentUser();
  if (!user || user.email !== BUSINESS.supportEmail) return notFound();

  // 2. Fetch Stats
  const { rows: stats } = await pool.query(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE "isPro" = true AND COALESCE("proPlan", '') <> 'trial') as pro_users,
      (SELECT COUNT(*) FROM career_pathways) as total_pathways
    FROM users
  `);

  const { total_users, pro_users, total_pathways } = stats[0];

  // The $10,000 plan: money kept since 28 Sep, sales by offer, Sprints,
  // seat codes and partner payouts.
  const [revenue, sales, sprints, spots, seatGroups] = await Promise.all([
    getRevenueSince(PLAN_START).catch(() => null),
    offerSales(PLAN_START).catch(() => null),
    listSprints().catch(() => []),
    getSprintSpots(),
    listSeatGroups().catch(() => []),
  ]);
  const plan = planStatus((revenue?.paidCents ?? 0) - (revenue?.refundedCents ?? 0));
  const offerOrders = sales ? OFFER_KEYS.reduce((n, k) => n + sales[k].orders, 0) : 0;
  const offerCents = sales ? OFFER_KEYS.reduce((n, k) => n + sales[k].cents, 0) : 0;
  // Every partner who signed up on /partners, plus any partner-* source that
  // brought a sale without signing up (a link you gave out by hand).
  const joined = await listPartners().catch(() => []);
  const partnerSources = new globalThis.Map<string, string | null>(joined.map((p) => [partnerSource(p.slug), p.email]));
  for (const source of Object.keys(revenue?.bySource ?? {})) {
    if (source.startsWith("partner-") && !partnerSources.has(source)) partnerSources.set(source, null);
  }
  const partners = [...partnerSources.entries()]
    .map(([source, email]) => ({ source, email, ...(revenue?.bySource[source] ?? { orders: 0, cents: 0 }) }))
    .sort((a, b) => b.cents - a.cents);
  const newCode = typeof searchParams.newcode === "string" ? searchParams.newcode : null;
  const reportFor = typeof searchParams.report === "string" && isGroupCode(searchParams.report) ? searchParams.report : null;
  const usage = reportFor ? await seatUsageReport(reportFor).catch(() => null) : null;
  const sentRecently = await recentOutreach(30).catch(() => []);
  const sentToday = sentRecently.filter((r) => r.day === new Date().toISOString().slice(0, 10)).length;
  const emailTo = typeof searchParams.to === "string" ? searchParams.to.slice(0, 200) : "";
  const dollars = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  // Revenue by channel - the growth scoreboard. Ranked by revenue, not traffic.
  const funnel = await getFunnelReport(30).catch(() => null);
  const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "-");

  // Refunds: everyone whose money-back window is open or closed in the last
  // 30 days, with how many Pro AI tools they've used - and a lookup by email.
  const { rows: refundRows } = await pool.query(`
    SELECT u.email, u."proPlan", r.count AS used, r.expires_at AS until
      FROM rate_limits r
      JOIN users u ON r.key = 'refund_window_' || u.id
     WHERE r.expires_at > now() - interval '30 days'
     ORDER BY r.expires_at DESC
     LIMIT 100
  `);
  const lookupEmail = typeof searchParams.refund === "string" ? searchParams.refund.trim().toLowerCase() : "";
  let lookup: { email: string; verdict: string } | null = null;
  if (lookupEmail) {
    const { rows } = await pool.query(`SELECT id, email FROM users WHERE lower(email) = $1 LIMIT 1`, [lookupEmail]);
    if (!rows[0]) {
      lookup = { email: lookupEmail, verdict: "No Work-ly account with this email. Check the email on their Polar order." };
    } else {
      const status = await getRefundStatus(rows[0].id as string);
      lookup = {
        email: rows[0].email as string,
        verdict: !status
          ? "No money-back window on record (bought before the light-use rule started, or never bought). Decide yourself."
          : status.eligible
            ? `Eligible - refund in full. ${status.used} of ${status.limit} Pro AI tools used; window open until ${status.until?.toLocaleDateString("en-GB")}.`
            : status.until && status.until.getTime() <= Date.now()
              ? `Not eligible - the ${BUSINESS.refundDays}-day window closed on ${status.until.toLocaleDateString("en-GB")}.`
              : `Not eligible - ${status.used} Pro AI tools used (limit ${status.limit}).`,
      };
    }
  }

  // How every Pro account got Pro (lib/pro-source.ts): a paid plan, the
  // Sprint, a seat or gift code, a free code, the trial - counted across all
  // users, not just this page.
  const PRO_SOURCE_COLUMNS = `u."isPro", u."proPlan", u."proUntil",
      (SELECT b.code FROM beta_codes b WHERE b."usedByUserId" = u.id ORDER BY b."usedAt" DESC NULLS LAST LIMIT 1) AS code_used,
      EXISTS (SELECT 1 FROM rate_limits r WHERE r.key = 'refund_first_' || u.id) AS has_paid`;
  const toSource = (r: Record<string, unknown>) =>
    proSource({
      isPro: Boolean(r.isPro),
      proPlan: (r.proPlan as string | null) ?? null,
      proUntil: (r.proUntil as Date | null) ?? null,
      codeUsed: (r.code_used as string | null) ?? null,
      hasPaid: Boolean(r.has_paid),
    });
  const { rows: proRows } = await pool
    .query(`SELECT u.email, ${PRO_SOURCE_COLUMNS} FROM users u WHERE u."isPro" = true OR EXISTS (SELECT 1 FROM rate_limits r WHERE r.key = 'refund_first_' || u.id)`)
    .catch(() => ({ rows: [] as Record<string, unknown>[] }));
  const proCounts = new globalThis.Map<ProSourceKind, number>();
  for (const r of proRows) {
    const k = toSource(r).kind;
    proCounts.set(k, (proCounts.get(k) ?? 0) + 1);
  }

  // 3. Fetch Paginated Users (Safe for scaling)
  const page = Number(searchParams.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  const { rows: users } = await pool.query(`
    SELECT
      u.id, u.email, u.name, u."createdAt",
      (SELECT MAX(g."primaryTargetRole") FROM career_goals g WHERE g."userId" = u.id) AS target_role,
      (SELECT COUNT(*) FROM career_pathways p WHERE p."userId" = u.id) AS pathways_count,
      -- What each person actually did, for personal follow-up: did they add
      -- a resume, and how many jobs did they check?
      (SELECT COUNT(*) FROM documents d WHERE d."userId" = u.id) AS resumes,
      (SELECT COUNT(*) FROM jobs j WHERE j."userId" = u.id) AS jobs_checked,
      (SELECT MAX(j."createdAt") FROM jobs j WHERE j."userId" = u.id) AS last_check,
      ${PRO_SOURCE_COLUMNS}
    FROM users u
    ORDER BY u."createdAt" DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Command Center</h1>
            <p className="text-zinc-400 mt-1">Total visibility into Work-ly's growth.</p>
          </div>
          <AdminClientActions adminKey={key as string} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Total Users</CardTitle>
              <Users className="size-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{total_users}</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Pro Accounts</CardTitle>
              <Crown className="size-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{pro_users}</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Pathways Generated</CardTitle>
              <Map className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{total_pathways}</div>
            </CardContent>
          </Card>
        </div>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Revenue vs {dollars(PLAN_GOAL_USD)} by 31 Dec</h2>
              <p className="text-sm text-zinc-400">
                Paid orders since 28 Sep minus refunds, before {BUSINESS.paymentProvider}&apos;s fees.
                {plan.week ? ` Week ${plan.week.week}: ${plan.week.job}.` : ""} {plan.daysLeft} days left.
              </p>
            </div>
            <p className="text-3xl font-bold tabular-nums text-white">{usd(Math.round(plan.bankedUsd * 100))}</p>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800" role="img" aria-label={`${plan.goalPct}% of the goal`}>
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(1, plan.goalPct)}%` }} />
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <p className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-zinc-300">
              Plan says today: <span className="font-semibold text-white">{dollars(plan.targetTodayUsd)}</span>
            </p>
            <p className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-zinc-300">
              {plan.aheadUsd >= 0 ? "Ahead by " : "Behind by "}
              <span className={plan.aheadUsd >= 0 ? "font-semibold text-green-400" : "font-semibold text-amber-400"}>
                {dollars(Math.abs(plan.aheadUsd))}
              </span>
            </p>
            <p className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-zinc-300">
              Checkpoint 30 Nov: <span className="font-semibold text-white">{dollars(PLAN_CHECKPOINT.usd)}</span>
              {revenue && revenue.refundedCents > 0 ? ` · refunds ${usd(revenue.refundedCents)}` : ""}
            </p>
          </div>
          {sales && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-zinc-400">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Sold since 28 Sep</th>
                    <th className="py-2 pr-4 text-right font-medium">Orders</th>
                    <th className="py-2 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  <tr className="border-t border-zinc-800">
                    <td className="py-2 pr-4 text-white">Pro plans (Monthly, 3-Month, Yearly)</td>
                    <td className="py-2 pr-4 text-right">{Math.max(0, (revenue?.orders ?? 0) - offerOrders)}</td>
                    <td className="py-2 text-right">{usd(Math.max(0, (revenue?.paidCents ?? 0) - offerCents))}</td>
                  </tr>
                  {OFFER_KEYS.map((k) => (
                    <tr key={k} className="border-t border-zinc-800">
                      <td className="py-2 pr-4 text-white">
                        {OFFERS[k].name} <span className="text-zinc-500">({OFFERS[k].price})</span>
                      </td>
                      <td className="py-2 pr-4 text-right">{sales[k].orders}</td>
                      <td className="py-2 text-right">{usd(sales[k].cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section id="outbox" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Email someone</h2>
            <p className="text-sm text-zinc-400">
              One personal email at a time, from advitya@work-ly.in through Resend. {sentToday} of {OUTREACH_DAILY_CAP} sent today.
              Use &quot;Email&quot; next to anyone in the user list below to fill in their address.
            </p>
          </div>
          <OutboxForm adminKey={key as string} initialTo={emailTo} addressOk={addressLooksComplete(BUSINESS.address)} />
          {sentRecently.length > 0 && (
            <details className="text-sm text-zinc-400">
              <summary className="cursor-pointer text-zinc-300">Sent recently ({sentRecently.length})</summary>
              <ul className="mt-2 space-y-1">
                {sentRecently.map((r) => (
                  <li key={`${r.day}-${r.email}`}>
                    <span className="text-zinc-500">{r.day}</span> · {r.email}
                    {r.times > 1 ? ` (${r.times}x)` : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section id="sprints" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Application Sprints</h2>
              <p className="text-sm text-zinc-400">
                {spots.open} of {spots.capacity} spots open. /sprint shows this number; mark a Sprint delivered to free its spot.
              </p>
            </div>
            <form action={setSprintCapacityAction} className="flex items-center gap-2">
              <input type="hidden" name="key" value={key as string} />
              <label className="text-sm text-zinc-400" htmlFor="capacity">Spots at once</label>
              <input id="capacity" name="capacity" type="number" min={0} max={20} defaultValue={spots.capacity} className="w-20 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white" />
              <button type="submit" className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-white hover:bg-zinc-700">Save</button>
            </form>
          </div>
          {sprints.length === 0 ? (
            <p className="text-sm text-zinc-400">No Sprints yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-zinc-400">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Paid</th>
                    <th className="py-2 pr-4 font-medium">Buyer</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium"><span className="sr-only">Action</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {sprints.map((sp) => (
                    <tr key={sp.key}>
                      <td className="py-2 pr-4 text-zinc-400 whitespace-nowrap">{sp.day}</td>
                      <td className="py-2 pr-4 text-white">{sp.email ?? sp.userId}{sp.name ? <span className="text-zinc-500"> · {sp.name}</span> : null}</td>
                      <td className="py-2 pr-4 text-zinc-300">{SPRINT_STATUS_LABEL[sp.status]}</td>
                      <td className="py-2 text-right">
                        {sp.status !== "delivered" && (
                          <form action={markSprintDeliveredAction}>
                            <input type="hidden" name="key" value={key as string} />
                            <input type="hidden" name="sprint" value={sp.key} />
                            <button type="submit" className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800">Mark delivered</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-zinc-500">Intake forms arrive by email and are saved as SPRINT_INTAKE feedback on the buyer&apos;s account.</p>
        </section>

        <section id="seat-codes" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Seat codes</h2>
            <p className="text-sm text-zinc-400">
              One code, many people: each redeems at work-ly.in/redeem?code=… for Pro on their own account. Paid packs make their
              own code; make one here for a free trial pass or a deal closed by email.
            </p>
          </div>
          {newCode && (
            <p className="rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-300">
              New code: <span className="font-mono font-semibold text-white select-all">{newCode}</span> · link:{" "}
              <span className="select-all">{`${BUSINESS.url}/redeem?code=${newCode}`}</span>
            </p>
          )}
          <form action={createSeatCodeAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input type="hidden" name="key" value={key as string} />
            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              Seats
              <input name="seats" type="number" min={1} max={500} defaultValue={1} className="w-24 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              Months each
              <input name="months" type="number" min={1} max={12} defaultValue={3} className="w-24 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white" />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-zinc-400">
              Label (who it&apos;s for)
              <input name="label" required maxLength={40} placeholder="e.g. coach-trial-jane" className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white placeholder:text-zinc-600" />
            </label>
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Make code</button>
          </form>
          {usage && (
            <div className="space-y-2 rounded-md border border-zinc-700 bg-zinc-950 p-4">
              <p className="text-sm font-medium text-white">
                Usage report for <span className="font-mono">{usage.group}</span> ({usage.label}) - copy it into an email to the program:
              </p>
              <textarea
                readOnly
                rows={11}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-3 font-mono text-xs text-zinc-200"
                defaultValue={seatReportText(usage, "", new Date())}
              />
              <p className="text-xs text-zinc-500">
                Totals only. Tailored resumes and Pro tools are counted from 29 Sep 2026, when this tracking started.
              </p>
            </div>
          )}
          {seatGroups.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-zinc-400">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Code</th>
                    <th className="py-2 pr-4 font-medium">Label</th>
                    <th className="py-2 pr-4 text-right font-medium">Used</th>
                    <th className="py-2 pr-4 text-right font-medium">Months</th>
                    <th className="py-2 pr-4 font-medium">Made</th>
                    <th className="py-2 font-medium"><span className="sr-only">Report</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 tabular-nums">
                  {seatGroups.map((g) => (
                    <tr key={g.group}>
                      <td className="py-2 pr-4 font-mono text-white select-all">{g.group}</td>
                      <td className="py-2 pr-4 text-zinc-400">{g.label}</td>
                      <td className="py-2 pr-4 text-right text-zinc-200">
                        {g.used} / {g.seats}
                        {g.disabled > 0 ? <span className="text-zinc-500"> ({g.disabled} off)</span> : null}
                      </td>
                      <td className="py-2 pr-4 text-right text-zinc-400">{g.months}</td>
                      <td className="py-2 pr-4 text-zinc-400 whitespace-nowrap">{g.createdAt ? g.createdAt.toLocaleDateString("en-GB") : "-"}</td>
                      <td className="py-2 text-right">
                        <a href={`/admin?key=${encodeURIComponent(key as string)}&report=${encodeURIComponent(g.group)}#seat-codes`} className="text-xs text-primary hover:underline">
                          Usage report
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Partner payouts ({PARTNER_PERCENT}%)</h2>
            <p className="text-sm text-zinc-400">
              Partners sign up at /partners and get work-ly.in/?ref=partner-<em>name</em>. Orders from visitors who first arrived
              through a link, since 28 Sep. Pay monthly once someone is owed $25 or more.
            </p>
          </div>
          {partners.length === 0 ? (
            <p className="text-sm text-zinc-400">No partners yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-zinc-400">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Partner</th>
                    <th className="py-2 pr-4 text-right font-medium">Orders</th>
                    <th className="py-2 pr-4 text-right font-medium">Revenue</th>
                    <th className="py-2 text-right font-medium">Owed (30%)</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {partners.map((p) => (
                    <tr key={p.source} className="border-t border-zinc-800">
                      <td className="py-2 pr-4 text-white">
                        {p.source.replace(/^partner-/, "")}
                        {p.email ? <span className="text-zinc-500"> · {p.email}</span> : <span className="text-zinc-500"> · not signed up</span>}
                      </td>
                      <td className="py-2 pr-4 text-right">{p.orders}</td>
                      <td className="py-2 pr-4 text-right">{usd(p.cents)}</td>
                      <td className="py-2 text-right font-semibold text-white">{usd(Math.round((p.cents * PARTNER_PERCENT) / 100))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Paying customers by channel (last 30 days)</h2>
              <p className="text-sm text-zinc-400">
                Credited to the first link or site that brought each visitor. Ranked by revenue, not traffic.
              </p>
            </div>
            {funnel && (
              <p className="text-sm text-zinc-300">
                Last 7 days: <span className="font-semibold text-white">{funnel.paidLast7} paid</span> ·{" "}
                <span className="font-semibold text-white">{usd(funnel.revenueLast7Cents)}</span>
              </p>
            )}
          </div>
          {!funnel ? (
            <p className="text-sm text-zinc-400">Couldn&apos;t load the channel report.</p>
          ) : funnel.rows.length === 0 ? (
            <p className="text-sm text-zinc-400">No tracked visits yet. Share links with ?utm_source=... to start.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-zinc-400">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Channel</th>
                    <th className="py-2 pr-4 text-right font-medium">Free checks</th>
                    <th className="py-2 pr-4 text-right font-medium">Signups</th>
                    <th className="py-2 pr-4 text-right font-medium">Saw offer</th>
                    <th className="py-2 pr-4 text-right font-medium">Checkouts</th>
                    <th className="py-2 pr-4 text-right font-medium">Paid</th>
                    <th className="py-2 pr-4 text-right font-medium">Revenue</th>
                    <th className="py-2 text-right font-medium">Signup → paid</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {funnel.rows.map((r) => (
                    <tr key={r.channel} className="border-t border-zinc-800">
                      <td className="py-2 pr-4 text-white">{r.channel}</td>
                      <td className="py-2 pr-4 text-right">{r.checks}</td>
                      <td className="py-2 pr-4 text-right">{r.signups}</td>
                      <td className="py-2 pr-4 text-right">{r.offers}</td>
                      <td className="py-2 pr-4 text-right">{r.checkouts}</td>
                      <td className="py-2 pr-4 text-right font-semibold text-white">{r.paid}</td>
                      <td className="py-2 pr-4 text-right font-semibold text-white">{usd(r.revenueCents)}</td>
                      <td className="py-2 text-right">{pct(r.paid, r.signups)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-zinc-700 font-semibold text-white">
                    <td className="py-2 pr-4">Total</td>
                    <td className="py-2 pr-4 text-right">{funnel.totals.checks}</td>
                    <td className="py-2 pr-4 text-right">{funnel.totals.signups}</td>
                    <td className="py-2 pr-4 text-right">{funnel.totals.offers}</td>
                    <td className="py-2 pr-4 text-right">{funnel.totals.checkouts}</td>
                    <td className="py-2 pr-4 text-right">{funnel.totals.paid}</td>
                    <td className="py-2 pr-4 text-right">{usd(funnel.totals.revenueCents)}</td>
                    <td className="py-2 text-right">{pct(funnel.totals.paid, funnel.totals.signups)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Refund requests</h2>
            <p className="text-sm text-zinc-400">
              Before refunding in Polar: a first purchase qualifies within {BUSINESS.refundDays} days while the buyer has used
              fewer than {BUSINESS.refundUsageLimit} Pro AI tools.
            </p>
          </div>
          <form method="get" className="flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="key" value={key as string} />
            <input
              name="refund"
              type="email"
              defaultValue={lookupEmail}
              placeholder="Buyer's email"
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
            />
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Check
            </button>
          </form>
          {lookup && (
            <p className="rounded-md border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-200">
              <span className="font-medium text-white">{lookup.email}:</span> {lookup.verdict}
            </p>
          )}
          {refundRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-400 uppercase border-b border-zinc-800">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Buyer</th>
                    <th className="py-2 pr-4 font-medium">Plan</th>
                    <th className="py-2 pr-4 font-medium">Pro AI tools used</th>
                    <th className="py-2 pr-4 font-medium">Window ends</th>
                    <th className="py-2 font-medium">Refund?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {refundRows.map((r) => {
                    const open = new Date(r.until).getTime() > Date.now();
                    const ok = open && Number(r.used) < BUSINESS.refundUsageLimit;
                    return (
                      <tr key={r.email as string}>
                        <td className="py-2 pr-4 text-white">{r.email}</td>
                        <td className="py-2 pr-4 text-zinc-400">{r.proPlan ?? "-"}</td>
                        <td className="py-2 pr-4 tabular-nums text-zinc-300">
                          {r.used} / {BUSINESS.refundUsageLimit}
                        </td>
                        <td className="py-2 pr-4 text-zinc-400 whitespace-nowrap">
                          {new Date(r.until).toLocaleDateString("en-GB")}
                        </td>
                        <td className="py-2">
                          {ok ? (
                            <Badge className="bg-green-500/15 text-green-400 border-0">Eligible</Badge>
                          ) : (
                            <Badge variant="outline" className="text-zinc-400 border-zinc-700">
                              {open ? "Used too much" : "Window closed"}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section id="how-pro" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-white">How people got Pro</h2>
            <p className="text-sm text-zinc-400">
              Every account with Pro now, or that paid before. The user list below shows each person&apos;s source and code.
            </p>
          </div>
          {proRows.length === 0 ? (
            <p className="text-sm text-zinc-400">No Pro accounts yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="tabular-nums">
                {PRO_SOURCE_ORDER.filter((k) => proCounts.get(k)).map((k) => (
                  <tr key={k} className="border-t border-zinc-800">
                    <td className="py-2 pr-4 text-white">{PRO_SOURCE_TITLE[k]}</td>
                    <td className="py-2 text-right font-semibold text-white">{proCounts.get(k)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-400 uppercase bg-zinc-900 border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Joined</th>
                  <th className="px-6 py-4 font-medium">Target Role</th>
                  <th className="px-6 py-4 font-medium">Resume</th>
                  <th className="px-6 py-4 font-medium">Jobs checked</th>
                  <th className="px-6 py-4 font-medium">Pathways</th>
                  <th className="px-6 py-4 font-medium">Pro, and how</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">
                        {u.email}{" "}
                        <a
                          href={`/admin?key=${encodeURIComponent(key as string)}&to=${encodeURIComponent(u.email)}#outbox`}
                          className="ml-1 text-xs font-normal text-primary hover:underline"
                        >
                          Email
                        </a>
                      </div>
                      {u.name && <div className="text-zinc-500 text-xs mt-0.5">{u.name}</div>}
                    </td>
                    <td className="px-6 py-4 text-zinc-400 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {u.target_role ? (
                        <span className="text-zinc-300">{u.target_role}</span>
                      ) : (
                        <span className="text-zinc-600 italic">None set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-zinc-300">{Number(u.resumes) > 0 ? "Yes" : <span className="text-zinc-600">No</span>}</td>
                    <td className="px-6 py-4 text-zinc-300 whitespace-nowrap">
                      {Number(u.jobs_checked)}
                      {u.last_check && (
                        <span className="text-zinc-500 text-xs"> · last {new Date(u.last_check).toLocaleDateString("en-GB")}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Activity className="size-3 text-zinc-500" />
                        <span className="text-zinc-300">{u.pathways_count}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const src = toSource(u);
                        const active = src.kind !== "free" && src.kind !== "expired";
                        return (
                          <div className="flex flex-col gap-1">
                            {active ? (
                              <Badge variant="default" className="w-fit bg-primary/20 text-primary hover:bg-primary/30 border-0">Pro</Badge>
                            ) : (
                              <Badge variant="outline" className="w-fit text-zinc-500 border-zinc-700">Free</Badge>
                            )}
                            {src.kind !== "free" && (
                              <span className="text-xs text-zinc-400 whitespace-nowrap">
                                {src.label}
                                {src.detail ? <span className="text-zinc-500"> · {src.detail}</span> : null}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 50 && (
            <div className="p-4 border-t border-zinc-800 text-center">
              <a href={`/admin?key=${key}&page=${page + 1}`} className="text-sm text-primary hover:underline">
                Load Next 50 Users →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
