import os
import json
import urllib.request

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")

def send_interview_pass_email(student_email: str, student_name: str, company: str, job_title: str, block: str, chamber: str, slot_time: str):
    """
    Dispatches verified HTML interview pass to student registered email using Resend API.
    Gracefully logs if API key is not yet provided.
    """
    subject = f"🎯 Interview Confirmed: {company} - {job_title} at {block}"
    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px; color: #0f172a; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <div style="background-color: #1e3a8a; color: white; padding: 20px;">
            <h2 style="margin: 0;">VFSTR Training & Placement Cell</h2>
            <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Official Campus Recruitment Pass</p>
          </div>
          <div style="padding: 24px;">
            <p>Dear <b>{student_name}</b>,</p>
            <p>Your interview panel and physical venue for <b>{company}</b> ({job_title}) have been officially confirmed.</p>
            
            <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <p style="margin: 4px 0;"><b>🏢 Campus Venue:</b> {block} - {chamber}</p>
              <p style="margin: 4px 0;"><b>⏰ Allocated Slot:</b> {slot_time}</p>
              <p style="margin: 4px 0;"><b>💼 Company:</b> {company}</p>
            </div>

            <p style="font-size: 13px; color: #475569;">Please report to the allocated venue 10 minutes prior to your slot with 2 hard copies of your ATS resume and VFSTR student ID card.</p>
            <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Vignan's Foundation for Science, Technology and Research (VFSTR)</p>
          </div>
        </div>
      </body>
    </html>
    """

    if not RESEND_API_KEY or RESEND_API_KEY.startswith("your_"):
        print(f"[EMAIL SIMULATION] Sent to {student_email}: {subject} | Venue: {block} - {chamber} at {slot_time}")
        return {"status": "simulated", "recipient": student_email}

    try:
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps({
                "from": "VFSTR Placements <onboarding@resend.dev>",
                "to": [student_email],
                "subject": subject,
                "html": html_body
            }).encode('utf-8'),
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json"
            }
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"[RESEND EMAIL DELIVERED] ID: {data.get('id')} to {student_email}")
            return {"status": "delivered", "id": data.get("id")}
    except Exception as e:
        print(f"[RESEND EMAIL NOTICE] Could not dispatch email: {e}")
        return {"status": "failed", "error": str(e)}
