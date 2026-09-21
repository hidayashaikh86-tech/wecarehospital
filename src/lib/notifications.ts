import { Appointment } from '../types';

export interface NotificationPayload {
  sms: {
    recipientPhone: string;
    message: string;
    status: 'Delivered' | 'Pending' | 'Failed';
    timestamp: string;
  };
  email: {
    recipientEmail: string;
    subject: string;
    body: string;
    status: 'Delivered' | 'Pending' | 'Failed';
    timestamp: string;
  };
}

export function generateAppointmentNotifications(appt: Appointment): NotificationPayload {
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const smsMessage = `[WeCare Hospitals] Hello ${appt.patientName}, your appointment with ${appt.doctorName} (${appt.departmentName}) is ${appt.status.toUpperCase()} for ${appt.date} at ${appt.timeSlot}. Booking Ref: #${appt.id}. Emergency Helpline: 0800 700 900.`;

  const emailSubject = `Appointment Confirmation - WeCare Hospitals (Ref: #${appt.id})`;

  const emailBody = `Dear ${appt.patientName},

Your appointment request at WeCare Hospitals has been officially ${appt.status.toLowerCase()}.

==========================================
APPOINTMENT DETAILS
==========================================
• Reference ID: #${appt.id}
• Department: ${appt.departmentName}
• Attending Specialist: ${appt.doctorName}
• Date: ${appt.date}
• Scheduled Time: ${appt.timeSlot}
• Contact Phone: ${appt.patientPhone}
• Contact Email: ${appt.patientEmail || 'N/A'}
• Chief Complaint / Notes: ${appt.notes || 'None provided'}

==========================================
HOSPITAL LOCATION & INSTRUCTIONS
==========================================
Location: WeCare Main Campus - Gate B, 100 Healthcare Parkway
Arrival: Please arrive 15 minutes before your scheduled slot.
Requirements: Bring a valid photo ID and any relevant medical test reports.

Need to reschedule or speak with triage? 
Call our 24/7 Helpline: 0800 700 900

Warm regards,
WeCare Hospitals Patient Care Team`;

  return {
    sms: {
      recipientPhone: appt.patientPhone || 'N/A',
      message: smsMessage,
      status: 'Delivered',
      timestamp: timeStr
    },
    email: {
      recipientEmail: appt.patientEmail || 'N/A',
      subject: emailSubject,
      body: emailBody,
      status: 'Delivered',
      timestamp: timeStr
    }
  };
}

export function createRawRFC2822Message(to: string, subject: string, body: string): string {
  const lines = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body
  ];
  const fullEmail = lines.join('\r\n');
  return btoa(unescape(encodeURIComponent(fullEmail)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sendAutomatedGmailMessage(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<{ id: string; threadId: string }> {
  const raw = createRawRFC2822Message(to, subject, body);
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Gmail API HTTP ${response.status}`);
  }

  return await response.json();
}

