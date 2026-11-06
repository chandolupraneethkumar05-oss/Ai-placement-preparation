import os
import json
import html
import urllib.request
import urllib.error
from app.core.config import RESEND_API_KEY, EMAIL_FROM_ADDRESS

def send_shortlist_email(
    student_email: str,
    student_name: str,
    company: str,
    job_title: str
) -> dict:
    """
    Dispatches verified HTML email notification to student when their application is Shortlisted.
    HTML-escapes all parameters to prevent HTML injection attacks.
    """
    safe_name = html.escape(student_name or "Candidate")
    safe_company = html.escape(company or "Corporate Partner")
    safe_title = html.escape(job_title or "Campus Recruitment")

    subject = f"🎉 Shortlisted for {company} - {job_title} | VFSTR Placements"
    html_body = f"""
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; background-color: #f8fafc; line-height: 1.5;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background: linear-gradient(135deg, #1e3a8a, #312e81); color: white; padding: 24px;">
            <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #93c5fd;">Training & Placement Cell</div>
            <h2 style="margin: 8px 0 0 0; font-size: 20px; font-weight: 800;">Application Shortlisted!</h2>
          </div>
          <div style="padding: 28px;">
            <p style="font-size: 15px; margin-top: 0;">Dear <b>{safe_name}</b>,</p>
            <p style="font-size: 14px; color: #334155;">
              Congratulations! Your resume and profile have been officially reviewed and <b>Shortlisted</b> by <b>{safe_company}</b> for the position of <b>{safe_title}</b>.
            </p>
            
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; padding: 18px; border-radius: 10px; margin: 24px 0;">
              <div style="font-size: 13px; font-weight: bold; color: #166534; margin-bottom: 6px;">🎯 Next Steps:</div>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #14532d;">
                <li>Your company-specific <b>Interview Assessment Simulator</b> is now unlocked on your student portal.</li>
                <li>Your assigned interview panel, date, and venue chamber will be confirmed shortly.</li>
                <li>Check your Placement Dashboard to generate your official <b>Digital Hall Ticket & QR Pass</b>.</li>
              </ul>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
              Best regards,<br>
              <b>Central Training & Placement Cell</b><br>
              Vignan's Foundation for Science, Technology and Research (VFSTR)
            </p>
          </div>
        </div>
      </body>
    </html>
    """
    return _dispatch_email(student_email, subject, html_body)

def send_interview_pass_email(
    student_email: str,
    student_name: str,
    company: str,
    job_title: str,
    block: str,
    chamber: str,
    slot_time: str,
    slot_date: str = ""
) -> dict:
    """
    Dispatches verified HTML interview pass to student registered email using Resend API.
    HTML-escapes all parameters to prevent HTML injection attacks.
    """
    safe_name = html.escape(student_name or "Candidate")
    safe_company = html.escape(company or "Corporate Partner")
    safe_title = html.escape(job_title or "Campus Recruitment")
    safe_block = html.escape(block or "A Block")
    safe_chamber = html.escape(chamber or "Panel Chamber")
    safe_time = html.escape(slot_time or "Scheduled Slot")
    safe_date = html.escape(slot_date or "Scheduled Date")

    subject = f"🎯 Interview Pass Confirmed: {company} - {job_title} at {block}"
    html_body = f"""
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; background-color: #f8fafc; line-height: 1.5;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background: linear-gradient(135deg, #1e3a8a, #1e1b4b); color: white; padding: 24px;">
            <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #93c5fd;">Official Admit Card</div>
            <h2 style="margin: 8px 0 0 0; font-size: 20px; font-weight: 800;">Interview Pass Confirmed</h2>
          </div>
          <div style="padding: 28px;">
            <p style="font-size: 15px; margin-top: 0;">Dear <b>{safe_name}</b>,</p>
            <p style="font-size: 14px; color: #334155;">
              Your interview panel and physical campus venue for <b>{safe_company}</b> ({safe_title}) have been officially scheduled.
            </p>
            
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #2563eb; padding: 18px; border-radius: 10px; margin: 20px 0;">
              <p style="margin: 4px 0; font-size: 13px;"><b>🏢 Campus Venue:</b> {safe_block} - {safe_chamber}</p>
              <p style="margin: 4px 0; font-size: 13px;"><b>📅 Date:</b> {safe_date}</p>
              <p style="margin: 4px 0; font-size: 13px;"><b>⏰ Allocated Slot:</b> {safe_time}</p>
              <p style="margin: 4px 0; font-size: 13px;"><b>💼 Employer:</b> {safe_company}</p>
            </div>

            <p style="font-size: 13px; color: #475569;">
              Please report to the assigned chamber 15 minutes prior with 2 hard copies of your ATS resume and VFSTR student ID card.
            </p>
            <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
              Central Training & Placement Cell<br>
              Vignan's Foundation for Science, Technology and Research (VFSTR)
            </p>
          </div>
        </div>
      </body>
    </html>
    """
    return _dispatch_email(student_email, subject, html_body)

def send_reschedule_email(
    student_email: str,
    student_name: str,
    company: str,
    job_title: str,
    old_details: dict,
    new_block: str,
    new_chamber: str,
    new_slot_time: str,
    new_slot_date: str = ""
) -> dict:
    """
    Dispatches high-priority HTML reschedule notification to student registered email
    whenever recruiter modifies an allocated interview slot.
    """
    safe_name = html.escape(student_name or "Candidate")
    safe_company = html.escape(company or "Corporate Partner")
    safe_title = html.escape(job_title or "Campus Recruitment")
    safe_old_date = html.escape(old_details.get("date") or "Previous Date")
    safe_old_time = html.escape(old_details.get("time") or "Previous Time")
    safe_old_venue = html.escape(f"{old_details.get('block', 'Venue')} - {old_details.get('chamber', 'Chamber')}")
    
    safe_new_block = html.escape(new_block or "Assigned Block")
    safe_new_chamber = html.escape(new_chamber or "Panel Chamber")
    safe_new_time = html.escape(new_slot_time or "Scheduled Slot")
    safe_new_date = html.escape(new_slot_date or "Scheduled Date")

    subject = f"⚠️ Schedule Change: {company} - {job_title} Interview Updated | VFSTR Placements"
    html_body = f"""
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; background-color: #f8fafc; line-height: 1.5;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; border: 1px solid #fecaca; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background: linear-gradient(135deg, #b91c1c, #991b1b); color: white; padding: 24px;">
            <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #fca5a5;">Training & Placement Cell</div>
            <h2 style="margin: 8px 0 0 0; font-size: 20px; font-weight: 800;">⚠️ Interview Schedule Updated</h2>
          </div>
          <div style="padding: 28px;">
            <p style="font-size: 15px; margin-top: 0;">Dear <b>{safe_name}</b>,</p>
            <p style="font-size: 14px; color: #334155;">
              A <b>change happened in your drive</b>. Your interview schedule for <b>{safe_company}</b> ({safe_title}) has been modified by the recruiter.
            </p>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 14px 18px; border-radius: 8px; margin: 16px 0;">
              <div style="font-size: 12px; font-weight: bold; color: #991b1b; text-transform: uppercase;">Previous Schedule (Cancelled):</div>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #7f1d1d; text-decoration: line-through;">
                {safe_old_venue} on {safe_old_date} at {safe_old_time}
              </p>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; padding: 16px 18px; border-radius: 8px; margin: 16px 0;">
              <div style="font-size: 12px; font-weight: bold; color: #166534; text-transform: uppercase;">✅ New Confirmed Schedule:</div>
              <p style="margin: 6px 0 2px 0; font-size: 14px; color: #14532d;"><b>🏢 Venue:</b> {safe_new_block} — {safe_new_chamber}</p>
              <p style="margin: 2px 0; font-size: 14px; color: #14532d;"><b>📅 Date:</b> {safe_new_date}</p>
              <p style="margin: 2px 0; font-size: 14px; color: #14532d;"><b>⏰ Time:</b> {safe_new_time}</p>
            </div>

            <p style="font-size: 13px; color: #475569; margin-top: 20px;">
              <b>Action Required:</b> Please log in to your student portal to view the updated details and download your refreshed <b>Digital QR Hall Ticket</b> reflecting the new venue and timings.
            </p>

            <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
              Central Training & Placement Cell<br>
              Vignan's Foundation for Science, Technology and Research (VFSTR)
            </p>
          </div>
        </div>
      </body>
    </html>
    """
    return _dispatch_email(student_email, subject, html_body)

def _dispatch_email(recipient_email: str, subject: str, html_content: str) -> dict:
    if not recipient_email or "@" not in recipient_email:
        return {"status": "failed", "error": "Invalid recipient email address"}

    if not RESEND_API_KEY or RESEND_API_KEY.startswith("your_"):
        print(f"[EMAIL SIMULATION] To: {recipient_email} | Subject: {subject}")
        return {"status": "simulated", "recipient": recipient_email, "subject": subject}

    try:
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps({
                "from": EMAIL_FROM_ADDRESS,
                "to": [recipient_email],
                "subject": subject,
                "html": html_content
            }).encode('utf-8'),
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"[RESEND EMAIL DELIVERED] ID: {data.get('id')} to {recipient_email}")
            return {"status": "delivered", "id": data.get("id"), "recipient": recipient_email}
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8') if e.fp else str(e)
        print(f"[RESEND EMAIL ERROR {e.code}] {err_msg}")
        return {"status": "failed", "error": f"HTTP {e.code}: {err_msg}"}
    except Exception as e:
        print(f"[EMAIL DISPATCH EXCEPTION] {e}")
        return {"status": "failed", "error": str(e)}
