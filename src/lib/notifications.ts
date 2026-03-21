import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export interface NotifyPayload {
  userId: string;
  userEmail: string;
  userName: string;
  type: "VISIT_ASSIGNED" | "CALL_ASSIGNED";
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
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "CRM Polarizados <notificaciones@colonia.cloud>",
      to: userEmail,
      subject: title,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#f9f9f9;border-radius:8px;">
          <h2 style="color:#111;margin-bottom:8px;">${title}</h2>
          <p style="color:#444;margin-bottom:16px;">Hola <strong>${userName}</strong>,</p>
          <p style="color:#444;margin-bottom:24px;">${message}</p>
          ${link ? `<a href="${process.env.NEXTAUTH_URL}${link}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;">Ver detalles</a>` : ""}
          <hr style="margin:24px 0;border:none;border-top:1px solid #e5e5e5;" />
          <p style="color:#888;font-size:12px;">Este es un mensaje automático del CRM Polarizados. No respondas a este correo.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[sendNotification] email error:", err);
  }
}
