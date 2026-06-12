import { authorizedJobRequest } from "@/lib/job-auth";
import { hasMySqlConfig, initializeDatabase } from "@/lib/mysql";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function run(request: Request) {
  if (!authorizedJobRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasMySqlConfig()) {
    return Response.json(
      { error: "MySQL is not configured. Set MYSQL_URL or MYSQL_HOST variables." },
      { status: 400 },
    );
  }

  const result = await initializeDatabase();
  return Response.json(result);
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
