import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/db/pool";
import { AdminClientActions } from "./client-actions";
import { Users, Crown, Map, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // 1. Double Security Check (Secret Key + Admin Email)
  const key = searchParams.key;
  if (key !== process.env.ADMIN_SECRET) return notFound();

  const user = await getCurrentUser();
  if (!user || user.email !== "advitya@work-ly.in") return notFound();

  // 2. Fetch Stats
  const { rows: stats } = await pool.query(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE "isPro" = true) as pro_users,
      (SELECT COUNT(*) FROM career_pathways) as total_pathways
    FROM users
  `);

  const { total_users, pro_users, total_pathways } = stats[0];

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
