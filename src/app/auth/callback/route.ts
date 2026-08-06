import { type NextRequest } from "next/server";
import { handleAuthRedirect } from "@/lib/auth/handle-callback";

export async function GET(request: NextRequest) {
  return handleAuthRedirect(request);
}
