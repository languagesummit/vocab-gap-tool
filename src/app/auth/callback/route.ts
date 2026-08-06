import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth (Google) lands here with a ?code= to exchange for a session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // On Vercel the app sits behind a proxy; x-forwarded-host is the real host.
      const forwardedHost = request.headers.get("x-forwarded-host");
      if (process.env.NODE_ENV === "development" || !forwardedHost) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      return NextResponse.redirect(`https://${forwardedHost}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
