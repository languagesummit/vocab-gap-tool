import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Completes a sign-in redirect from Supabase.
 *
 * Supabase can hand back either shape depending on the email template and
 * flow in use:
 *   - `?code=...`                      (PKCE — the default templates)
 *   - `?token_hash=...&type=magiclink` (explicit verify links)
 *
 * Both are handled here so sign-in doesn't depend on which template the
 * project happens to have configured.
 */
export async function handleAuthRedirect(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  // Behind Vercel's proxy the request host is internal; this is the real one.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const base =
    process.env.NODE_ENV === "development" || !forwardedHost
      ? origin
      : `https://${forwardedHost}`;

  const next = searchParams.get("next") ?? "/dashboard";

  // Supabase reports its own failures as query params — surface the real
  // reason rather than a generic "invalid or expired".
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent(providerError)}`
    );
  }

  const supabase = await createClient();

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}${next}`);
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${base}${next}`);
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(
    `${base}/login?error=${encodeURIComponent(
      "The sign-in link was missing its verification code."
    )}`
  );
}
