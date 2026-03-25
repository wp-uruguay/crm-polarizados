import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      contact: true,
      items: { include: { product: true } },
    },
  });

  if (!quote) {
    return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
  }

  const email = quote.contact.email;
  if (!email) {
    return NextResponse.json({ error: "El contacto no tiene email registrado" }, { status: 400 });
  }

  if (!process.env.SMTP_USER) {
    return NextResponse.json({ error: "SMTP no configurado" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const pdfBase64: string | undefined = body.pdfBase64;

    const contactName = `${quote.contact.firstName ?? ""} ${quote.contact.lastName ?? ""}`.trim();
    const displayName = contactName || quote.contact.company || "estimado cliente";

    const whatsappLink = "https://api.whatsapp.com/send/?phone=5491168477185&text=Hola%2C+me+gustar%C3%ADa+recibir+asesoramiento+sobre+mi+presupuesto.&type=phone_number&app_absent=0";
    const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "https://crm.drpolarizados.com";

    const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
  <div style="text-align:center;margin-bottom:20px;">
    <img src="${baseUrl}/logomail.png" alt="Dr Polarizados" style="max-width:180px;height:auto;" />
  </div>
  <p style="color:#333;font-size:15px;line-height:1.6;">
    Hola, <strong>${displayName}</strong>.<br/>
    Te enviamos el presupuesto de nuestros artículos para que lo analices, en el PDF adjunto detallamos el costo, el descuento y los artículos solicitados/ofrecidos.
  </p>
  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e5e5;" />
  <p style="color:#666;font-size:13px;line-height:1.5;">
    <strong>Dr Polarizados</strong> - Distribuidor oficial<br/>
    <a href="https://www.drpolarizados.com" style="color:#2563eb;">www.drpolarizados.com</a><br/>
    <a href="mailto:ventas@drpolarizados.com" style="color:#2563eb;">ventas@drpolarizados.com</a>
  </p>
  <div style="margin-top:16px;">
    <a href="${whatsappLink}" style="display:inline-block;padding:10px 20px;background:#25D366;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;">
      💬 Chat por WhatsApp
    </a>
  </div>
</div>`;

    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

    const mailOptions: nodemailer.SendMailOptions = {
      from: `Dr Polarizados <${fromEmail}>`,
      to: email,
      subject: `Presupuesto #${quote.number} - Dr Polarizados`,
      html,
    };

    if (pdfBase64) {
      mailOptions.attachments = [
        {
          filename: `presupuesto-${quote.number}.pdf`,
          content: Buffer.from(pdfBase64, "base64"),
        },
      ];
    }

    await transporter.sendMail(mailOptions);

    // Update quote: mark as SENT and set sentAt
    await prisma.quote.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error sending quote email:", err);
    return NextResponse.json({ error: "Error al enviar email" }, { status: 500 });
  }
}
