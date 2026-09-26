import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/db/pool";
import { AdminClientActions } from "./client-actions";
import { Users, Crown, Map, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BUSINESS } from "@/lib/business";
import { getRefundStatus } from "@/lib/payments/refund-window";

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
      COUNT(*) FILTER (WHERE "isPro" = true) as pro_users,
      (SELECT COUNT(*) FROM career_pathways) as total_pathways
    FROM users
  `);

  const { total_users, pro_users, total_pathways } = stats[0];

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

  // 3. Fetch Paginated Users (Safe for scaling)
  const page = Number(searchParams.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  const { rows: users } = await pool.query(`
    SELECT 
      u.id, u.email, u.name, u."createdAt", u."isPro",
      MAX(g."primaryTargetRole") as target_role,
      COUNT(p.id) as pathways_count
    FROM users u
    LEFT JOIN career_goals g ON g."userId" = u.id
    LEFT JOIN career_pathways p ON p."userId" = u.id
    GROUP BY u.id
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

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-400 uppercase bg-zinc-900 border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Joined</th>
                  <th className="px-6 py-4 font-medium">Target Role</th>
                  <th className="px-6 py-4 font-medium">Pathways</th>
                  <th className="px-6 py-4 font-medium">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{u.email}</div>
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
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Activity className="size-3 text-zinc-500" />
                        <span className="text-zinc-300">{u.pathways_count}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.isPro ? (
                        <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30 border-0">Pro</Badge>
                      ) : (
                        <Badge variant="outline" className="text-zinc-500 border-zinc-700">Free</Badge>
                      )}
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
