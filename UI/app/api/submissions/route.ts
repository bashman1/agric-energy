import { NextRequest, NextResponse } from "next/server";
import { createSubmission, getAllSubmissions } from "@/lib/data/submissions";

// GET /api/submissions — list all submissions (admin only — protected by middleware)
export async function GET() {
  try {
    const submissions = await getAllSubmissions();
    return NextResponse.json(submissions);
  } catch {
    return NextResponse.json({ error: "Failed to load submissions" }, { status: 500 });
  }
}

// POST /api/submissions — create new submission (public, from contact form)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { submissionType, name, organisation, email, subject, message } = body;

    // Basic validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Required fields are missing." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    // Attempt to send notification email
    let emailStatus: "sent" | "not_sent" | "failed" = "not_sent";
    const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "agrienergy@nrep.go.ug";

    try {
      // Try nodemailer if SMTP env vars are configured
      const smtpHost = process.env.SMTP_HOST;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM ?? smtpUser ?? contactEmail;

      if (smtpHost && smtpUser && smtpPass) {
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.default.createTransport({
          host: smtpHost,
          port: Number(process.env.SMTP_PORT ?? 587),
          secure: process.env.SMTP_SECURE === "true",
          auth: { user: smtpUser, pass: smtpPass },
        });

        await transporter.sendMail({
          from: `"Agri-Energy Desk" <${smtpFrom}>`,
          to: contactEmail,
          replyTo: email,
          subject: `[Agri-Energy Desk] ${submissionType ?? "Enquiry"}: ${subject}`,
          html: `
            <h2 style="color:#1a6636">New Agri-Energy Desk Submission</h2>
            <table cellpadding="6" style="border-collapse:collapse;width:100%;max-width:600px;font-family:sans-serif;font-size:14px">
              <tr><td style="color:#555;width:140px"><strong>Type</strong></td><td>${submissionType ?? "—"}</td></tr>
              <tr><td style="color:#555"><strong>Name</strong></td><td>${name}</td></tr>
              <tr><td style="color:#555"><strong>Organisation</strong></td><td>${organisation ?? "—"}</td></tr>
              <tr><td style="color:#555"><strong>Email</strong></td><td><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="color:#555"><strong>Subject</strong></td><td>${subject}</td></tr>
            </table>
            <h3 style="color:#1a6636;margin-top:20px">Message</h3>
            <p style="background:#f5f5f5;padding:12px;border-radius:6px;font-size:14px">${message.replace(/\n/g, "<br>")}</p>
            <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
            <p style="color:#aaa;font-size:12px">Submitted via Agri-Energy Desk Contact Form — ${new Date().toLocaleString("en-UG", { timeZone: "Africa/Kampala" })} EAT</p>
          `,
          text: `New Agri-Energy Desk Submission\n\nType: ${submissionType}\nName: ${name}\nOrganisation: ${organisation}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
        });

        // Also send a confirmation to the submitter
        await transporter.sendMail({
          from: `"Agri-Energy Desk" <${smtpFrom}>`,
          to: email,
          subject: `Thank you for your submission — Agri-Energy Desk`,
          html: `
            <h2 style="color:#1a6636">Thank you, ${name}!</h2>
            <p style="font-family:sans-serif;font-size:14px;color:#333">
              We have received your submission "<strong>${subject}</strong>" and will review it shortly.
            </p>
            <p style="font-family:sans-serif;font-size:14px;color:#555">
              The Agri-Energy Desk team will respond to <a href="mailto:${email}">${email}</a> within 5 business days.
            </p>
            <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
            <p style="font-family:sans-serif;font-size:12px;color:#aaa">Agri-Energy Desk — Uganda National Platform · agrienergy@nrep.go.ug</p>
          `,
          text: `Thank you for your submission, ${name}! We received "${subject}" and will review it shortly.`,
        });

        emailStatus = "sent";
      }
      // If no SMTP config, leave as "not_sent" (will be visible in admin as pending)
    } catch (emailErr) {
      console.error("Email send failed:", emailErr);
      emailStatus = "failed";
    }

    // Always save regardless of email status
    const submission = await createSubmission({
      submissionType: submissionType ?? "General Enquiry",
      name,
      organisation: organisation ?? "",
      email,
      subject,
      message,
    });

    // Update with email status
    const { updateSubmission } = await import("@/lib/data/submissions");
    await updateSubmission(submission.id, { emailStatus });

    return NextResponse.json(
      { message: "Submission received successfully.", id: submission.id, emailStatus },
      { status: 201 }
    );
  } catch (err) {
    console.error("Submission POST error:", err);
    return NextResponse.json({ error: "Failed to save submission." }, { status: 500 });
  }
}
