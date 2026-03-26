import { prisma } from "@/lib/prisma";
import { transporter, FROM } from "@/lib/mailer";

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface NotifyPayload {
  userId: string;
  userEmail: string;
  userName: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}

export async function sendNotification(payload: NotifyPayload) {
  const { userId, userEmail, userName, type, title, message, link } = payload;

  // 1. Save in-app notification
  await prisma.notification.create({
    data: { userId, type, title, message, link: link ?? null },
  });

  // 2. Send email (fire-and-forget, don't break if it fails)
  if (!process.env.SMTP_USER) return;

  try {
    await transporter.sendMail({
      from: FROM(),
      to: userEmail,
      subject: title,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#f9f9f9;border-radius:8px;">
          <h2 style="color:#111;margin-bottom:8px;">${escapeHtml(title)}</h2>
          <p style="color:#444;margin-bottom:16px;">Hola <strong>${escapeHtml(userName)}</strong>,</p>
          <p style="color:#444;margin-bottom:24px;">${message}</p>
          ${link ? `<a href="${process.env.NEXTAUTH_URL}${escapeHtml(link)}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;">Ver detalles</a>` : ""}
          <hr style="margin:24px 0;border:none;border-top:1px solid #e5e5e5;" />
          <p style="color:#888;font-size:12px;">Este es un mensaje automático de DR Polarizados. No respondas a este correo.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[sendNotification] email error:", err);
  }
}
