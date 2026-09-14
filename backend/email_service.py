"""
Email Service for Pathik SCO
=============================
Currently: Logs credentials to console (no real email sent).
To enable real emails set EMAIL_PROVIDER in .env:
    EMAIL_PROVIDER=resend   -> set RESEND_API_KEY
    EMAIL_PROVIDER=smtp     -> set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
"""

import os
import logging

logger = logging.getLogger(__name__)

EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "console")   # console | resend | smtp
FRONTEND_URL   = os.getenv("FRONTEND_URL", "http://localhost:5173")
FROM_EMAIL     = os.getenv("FROM_EMAIL", "noreply@pathiksco.com")
FROM_NAME      = os.getenv("FROM_NAME", "Pathik SCO")


# ---------------------------------------------------------------------------
# Internal send helpers
# ---------------------------------------------------------------------------

def _send_via_console(to_email: str, subject: str, html_body: str) -> bool:
    """Development fallback -- prints to console instead of sending."""
    import re
    plain = re.sub(r"<[^>]+>", "", html_body).strip()
    logger.info("=" * 60)
    logger.info(f"[EMAIL CONSOLE] TO: {to_email}")
    logger.info(f"[EMAIL CONSOLE] SUBJECT: {subject}")
    for line in plain.split("\n"):
        if line.strip():
            logger.info(f"  {line.strip()}")
    logger.info("=" * 60)
    return True


def _send_via_resend(to_email: str, subject: str, html_body: str) -> bool:
    """Send via Resend (https://resend.com). Free: 100 emails/day."""
    try:
        import resend  # pip install resend
        resend.api_key = os.getenv("RESEND_API_KEY", "")
        resend.Emails.send({
            "from": f"{FROM_NAME} <{FROM_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html_body,
        })
        return True
    except Exception as e:
        logger.error(f"Resend error: {e}")
        return False


def _send_via_smtp(to_email: str, subject: str, html_body: str) -> bool:
    """Send via SMTP (Gmail, Zoho, etc.)."""
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{FROM_NAME} <{smtp_user}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, to_email, msg.as_string())
        return True
    except Exception as e:
        logger.error(f"SMTP error: {e}")
        return False


def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Route to the configured provider."""
    provider = EMAIL_PROVIDER.lower()
    if provider == "resend":
        return _send_via_resend(to_email, subject, html_body)
    elif provider == "smtp":
        return _send_via_smtp(to_email, subject, html_body)
    else:
        return _send_via_console(to_email, subject, html_body)


# ---------------------------------------------------------------------------
# Email Templates
# ---------------------------------------------------------------------------

def _welcome_resident_html(
    resident_name: str,
    society_name: str,
    house_no: str,
    email: str,
    password: str,
) -> str:
    login_url = f"{FRONTEND_URL}/login"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to {society_name}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;
                      box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);
                       padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">
                Welcome to {society_name}
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                Your resident portal account is ready
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.6;">
                Hello <strong>{resident_name}</strong>,
              </p>
              <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">
                Your account has been created for <strong>House {house_no}</strong>
                in <strong>{society_name}</strong>.
                Use the credentials below to log in to your resident portal.
              </p>
              <!-- Credential Box -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8faff;border:1.5px solid #e0e7ff;
                            border-radius:10px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 14px;color:#6b7280;font-size:12px;
                               font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">
                      Your Login Credentials
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
                          <span style="color:#9ca3af;font-size:13px;display:block;">Email</span>
                          <strong style="color:#111827;font-size:15px;">{email}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;">
                          <span style="color:#9ca3af;font-size:13px;display:block;">Password</span>
                          <strong style="color:#6366f1;font-size:18px;
                                         font-family:'Courier New',monospace;
                                         letter-spacing:2px;">{password}</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- CTA Button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="{login_url}"
                   style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);
                          color:#ffffff;text-decoration:none;padding:14px 36px;
                          border-radius:8px;font-size:15px;font-weight:600;">
                  Login to Portal
                </a>
              </div>
              <!-- Security tip -->
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;
                          padding:16px 20px;">
                <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                  Security Tip: Please change your password after your first login
                  from the Profile section.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;
                       text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                Pathik SCO - Society Management Platform<br/>
                If you have any issues, contact your society admin.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def send_resident_welcome_email(
    to_email: str,
    resident_name: str,
    society_name: str,
    house_no: str,
    plain_password: str,
) -> bool:
    """
    Send welcome email with login credentials to a new resident.
    Returns True if sent (or console-logged in dev mode).
    """
    subject = f"Welcome to {society_name} - Your Login Details"
    html    = _welcome_resident_html(
        resident_name=resident_name,
        society_name=society_name,
        house_no=house_no,
        email=to_email,
        password=plain_password,
    )
    ok = _send_email(to_email, subject, html)
    if ok:
        logger.info(f"Welcome email sent/logged for {to_email}")
    else:
        logger.warning(f"Failed to send welcome email to {to_email}")
    return ok
