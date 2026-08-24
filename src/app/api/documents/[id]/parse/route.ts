import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { parseDocumentAndBuildProfile } from "@/lib/career/parse-document";
import { safeMessage } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const RESUME_PARSE_LIMIT = 10;
const RESUME_PARSE_WINDOW_SECONDS = 600;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Parsing runs a full AI call per request - without a cap here, a
  // compromised or scripted account can drive unbounded AI spend by
  // hammering this endpoint.
  if (!(await checkRateLimit(`resume_parse_${user.id}`, RESUME_PARSE_LIMIT, RESUME_PARSE_WINDOW_SECONDS))) {
    return NextResponse.json({ error: "Too many parse requests recently. Please try again later." }, { status: 429 });
  }

  const { id } = await params;

  try {
    const result = await parseDocumentAndBuildProfile(id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    // Sanitized before it crosses the wire: this response is rendered in
    // the browser, and the underlying failure can be a database or AI
    // error whose text is not safe to show. See lib/errors.ts.
    return NextResponse.json(
      { error: safeMessage(error, "POST /api/documents/[id]/parse", "We couldn't read that file.") },
      { status: 422 },
    );
  }
}
