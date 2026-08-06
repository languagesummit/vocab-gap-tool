import { type NextRequest } from "next/server";
import { handleAuthRedirect } from "@/lib/auth/handle-callback";

// Magic-link emails may point here rather than /auth/callback depending on the
// configured template; both accept either parameter shape.
export async function GET(request: NextRequest) {
  return handleAuthRedirect(request);
}
