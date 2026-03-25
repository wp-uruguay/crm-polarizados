import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: Request) {
  try {
    const { to, subject, body, fromName } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    if (!process.env.SMTP_USER) {
      return NextResponse.json({ error: "SMTP no configurado" }, { status: 500 });
    }

    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
    const displayName = fromName || "DR Polarizados";

    const info = await transporter.sendMail({
      from: `${displayName} <${fromEmail}>`,
      to,
      subject,
      html: body.replace(/\n/g, "<br/>"),
    });

    return NextResponse.json({ id: info.messageId });
  } catch (err) {
    console.error("Error sending email:", err);
    return NextResponse.json({ error: "Error al enviar email" }, { status: 500 });
  }
}
