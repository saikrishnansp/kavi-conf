import smtplib
from email.message import EmailMessage
from app.core.config import get_settings
from app.utils.logging import logger

settings = get_settings()

def send_otp_email(email_to: str, otp_code: str):
    """
    Sends an OTP email. If SMTP is not configured, it gracefully falls back
    to printing the OTP to the console.
    """
    # Check if SMTP variables are set in the environment
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"SMTP not configured. Mocking email for {email_to}")
        print("\n" + "="*50)
        print(f"--- MOCK EMAIL: OTP for {email_to} is {otp_code} ---")
        print("="*50 + "\n")
        return

    try:
        msg = EmailMessage()
        msg['Subject'] = 'Your Kavi Conf Login Code'
        
        # Use fallback from email if available, otherwise use SMTP user
        from_email = settings.EMAILS_FROM_EMAIL or settings.SMTP_USER
        from_name = getattr(settings, "EMAILS_FROM_NAME", "Kavi Conf")
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = email_to

        # Clean HTML email template
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #333;">Your Kavi Conf Login Code</h2>
                <p>Hello,</p>
                <p>Use the following 6-digit code to securely log in to your account:</p>
                <div style="background-color: #f4f4f4; padding: 15px; display: inline-block; border-radius: 5px;">
                    <h1 style="letter-spacing: 5px; color: #1abc9c; margin: 0;">{otp_code}</h1>
                </div>
                <p><strong>Note:</strong> This code will expire in 5 minutes.</p>
                <p>If you did not request this code, please ignore this email.</p>
            </body>
        </html>
        """
        
        # Set plain text fallback, then add HTML
        msg.set_content(f"Your Kavi Conf OTP is: {otp_code}. It expires in 5 minutes.")
        msg.add_alternative(html_content, subtype='html')

        # Connect and send
        smtp_port = settings.SMTP_PORT if settings.SMTP_PORT else 587
        with smtplib.SMTP(settings.SMTP_HOST, smtp_port) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            
        logger.info(f"OTP email sent successfully to {email_to}")

    except Exception as e:
        logger.error(f"Failed to send OTP email to {email_to}: {e}")
        # Print to console anyway so you aren't locked out if email fails during dev
        print("\n" + "="*50)
        print(f"[FAILED EMAIL FALLBACK] OTP for {email_to}: {otp_code}")
        print("="*50 + "\n")

def send_booking_confirmation_email(
    email_to: str, 
    subject: str, 
    room_id: str, 
    start_time: str, 
    end_time: str, 
    meet_link: str | None = None
):
    """
    Sends a booking confirmation email to an attendee.
    """
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"SMTP not configured. Mocking booking email for {email_to}")
        return

    try:
        msg = EmailMessage()
        msg['Subject'] = f'Meeting Confirmed: {subject}'
        
        from_email = settings.EMAILS_FROM_EMAIL or settings.SMTP_USER
        from_name = getattr(settings, "EMAILS_FROM_NAME", "Kavi Conf")
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = email_to

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #333;">
                <h2 style="color: #1abc9c;">Meeting Confirmed!</h2>
                <p>Hello,</p>
                <p>A meeting has been scheduled with the following details:</p>
                <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #1abc9c; margin: 20px 0;">
                    <p><strong>Subject:</strong> {subject}</p>
                    <p><strong>Room:</strong> {room_id}</p>
                    <p><strong>Time:</strong> {start_time} - {end_time} (IST)</p>
                    {f'<p><strong>Google Meet:</strong> <a href="{meet_link}">{meet_link}</a></p>' if meet_link else ''}
                </div>
                <p>See you there!</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777;">This is an automated notification from Kavi Conf.</p>
            </body>
        </html>
        """
        
        msg.set_content(f"Meeting Confirmed: {subject}. Room: {room_id}. Time: {start_time} - {end_time}. Meet: {meet_link or 'N/A'}")
        msg.add_alternative(html_content, subtype='html')

        smtp_port = settings.SMTP_PORT if settings.SMTP_PORT else 587
        with smtplib.SMTP(settings.SMTP_HOST, smtp_port) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            
        logger.info(f"Booking email sent successfully to {email_to}")

    except Exception as e:
        logger.error(f"Failed to send booking email to {email_to}: {e}")
