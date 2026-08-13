export async function sendPasswordResetEmail(opts: {
  to: string;
  resetUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Tahfyz <onboarding@resend.dev>";
  if (!apiKey) {
    return {
      ok: false,
      error: "Email is not configured. Add RESEND_API_KEY on Vercel.",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: "Tahfyz password reset",
        html: `<p>Reset your Tahfyz password:</p><p><a href="${opts.resetUrl}">${opts.resetUrl}</a></p><p>This link expires in 1 hour.</p>`,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Email send failed: ${body.slice(0, 120)}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not send email" };
  }
}
