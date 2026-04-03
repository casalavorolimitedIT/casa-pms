import nodemailer from "nodemailer";

function createTransport() {
  const user = process.env.ZOHO_MAIL_USER;
  const pass = process.env.ZOHO_MAIL_PASSWORD;

  if (!user || !pass) {
    throw new Error("Missing ZOHO_MAIL_USER or ZOHO_MAIL_PASSWORD environment variables");
  }

  return nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,
    secure: true, // SSL
    auth: { user, pass },
  });
}

export interface StaffWelcomeEmailOptions {
  to: string;
  fullName: string;
  role: string;
  propertyName?: string;
  tempPassword: string;
  loginUrl: string;
}

export async function sendStaffWelcomeEmail(opts: StaffWelcomeEmailOptions): Promise<void> {
  const from = process.env.ZOHO_MAIL_FROM ?? process.env.ZOHO_MAIL_USER;
  const fromName = process.env.ZOHO_MAIL_FROM_NAME ?? "Casa PMS";
  const transport = createTransport();

  const roleDisplay = opts.role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const propertyLine = opts.propertyName
    ? `<p style="margin:0 0 8px">Property: <strong>${opts.propertyName}</strong></p>`
    : "";

  await transport.sendMail({
    from: `"${fromName}" <${from}>`,
    to: opts.to,
    subject: `Your ${fromName} account is ready`,
    text: [
      `Hi ${opts.fullName},`,
      ``,
      `Your staff account has been created on ${fromName}.`,
      ``,
      `Role: ${roleDisplay}`,
      opts.propertyName ? `Property: ${opts.propertyName}` : "",
      ``,
      `Log in at: ${opts.loginUrl}`,
      `Email: ${opts.to}`,
      `Temporary password: ${opts.tempPassword}`,
      ``,
      `Please change your password immediately after signing in.`,
      ``,
      `This is an automated message — do not reply.`,
    ]
      .filter((l) => l !== undefined)
      .join("\n"),
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr><td style="background:#ff6900;padding:28px 32px">
          <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">${fromName}</p>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.8)">Staff account created</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px">
          <p style="margin:0 0 20px;font-size:15px;color:#18181b">Hi <strong>${opts.fullName}</strong>,</p>
          <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6">
            Your staff account is ready. You can log in immediately using the credentials below.
          </p>

          <!-- Credentials box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;margin-bottom:24px">
            <tr><td style="padding:20px 24px">
              <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#a1a1aa">Your credentials</p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#71717a;width:120px">Login URL</td>
                  <td style="padding:4px 0;font-size:13px"><a href="${opts.loginUrl}" style="color:#ff6900;text-decoration:none">${opts.loginUrl}</a></td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#71717a">Email</td>
                  <td style="padding:4px 0;font-size:13px;color:#18181b">${opts.to}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#71717a">Password</td>
                  <td style="padding:4px 0;font-family:monospace;font-size:14px;font-weight:600;color:#18181b;letter-spacing:0.04em">${opts.tempPassword}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- Role box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;margin-bottom:24px">
            <tr><td style="padding:16px 24px">
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#a1a1aa">Your role</p>
              <p style="margin:0;font-size:14px;font-weight:600;color:#18181b">${roleDisplay}</p>
              ${propertyLine}
            </td></tr>
          </table>

          <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;background:#fef9c3;border:1px solid #fef08a;border-radius:6px;padding:12px 16px">
            ⚠️ This is a temporary password. Please change it immediately after signing in.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #f4f4f5">
          <p style="margin:0;font-size:11px;color:#a1a1aa">This is an automated message from ${fromName}. Do not reply.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
