import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// The app runs in guest mode: progress lives in the browser and is moved
// between devices by downloading and uploading a JSON file. The Supabase auth
// layer is kept intact for when cross-device sync is added — flip
// NEXT_PUBLIC_ENABLE_AUTH to "true" to bring it back into the request path.
const authEnabled = process.env.NEXT_PUBLIC_ENABLE_AUTH === "true";

export async function proxy(request: NextRequest) {
  if (!authEnabled) return NextResponse.next();
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * All request paths except static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
