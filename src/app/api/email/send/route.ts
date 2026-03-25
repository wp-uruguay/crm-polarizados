import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { to, subject, body, fromName } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY no configurada" }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const displayName = fromName || process.env.RESEND_FROM_NAME || "DR Polarizados";

    const { data, error } = await resend.emails.send({
      from: `${displayName} <${fromEmail}>`,
      to: [to],
      subject,
      html: body.replace(/\n/g, "<br/>"),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data?.id });
  } catch (err) {
    console.error("Error sending email:", err);
    return NextResponse.json({ error: "Error al enviar email" }, { status: 500 });
  }
}
