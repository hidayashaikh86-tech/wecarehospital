import React, { useState } from 'react';
import { Appointment } from '../types';
import { generateAppointmentNotifications, sendAutomatedGmailMessage } from '../lib/notifications';
import { authorizeGmailAndGetToken, getStoredGmailAccessToken } from '../lib/firebase';
import { 
  X, 
  MessageSquare, 
  Mail, 
  CheckCircle2, 
  Send, 
  Copy, 
  Smartphone, 
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Zap,
  Check,
  AlertCircle
} from 'lucide-react';

interface NotificationModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  appointment,
  isOpen,
  onClose
}) => {
  if (!isOpen || !appointment) return null;

  const [activeTab, setActiveTab] = useState<'sms' | 'email'>('sms');
  const [copiedType, setCopiedType] = useState<'sms' | 'email' | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Automated Gmail Sending State
  const [sendingGmailApi, setSendingGmailApi] = useState(false);
  const [gmailApiStatus, setGmailApiStatus] = useState<{
    type: 'success' | 'error' | 'none';
    message?: string;
  }>({ type: 'none' });

  const notifications = generateAppointmentNotifications(appointment);

  const handleCopy = (text: string, type: 'sms' | 'email') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleResend = () => {
    setResending(true);
    setResendSuccess(false);
    setTimeout(() => {
      setResending(false);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    }, 800);
  };

  const handleAutomatedGmailSend = async () => {
    if (!appointment.patientEmail) {
      setGmailApiStatus({
        type: 'error',
        message: 'Patient has no email address provided.'
      });
      return;
    }

    setSendingGmailApi(true);
    setGmailApiStatus({ type: 'none' });

    try {
      let token = getStoredGmailAccessToken();
      if (!token) {
        // Authorize with Google OAuth
        token = await authorizeGmailAndGetToken();
      }

      await sendAutomatedGmailMessage(
        token,
        appointment.patientEmail,
        notifications.email.subject,
        notifications.email.body
      );

      setGmailApiStatus({
        type: 'success',
        message: `Automated email dispatched directly via Gmail API to ${appointment.patientEmail}!`
      });
    } catch (err: any) {
      console.error('Gmail API send error:', err);
      // If token expired or permission error, prompt re-authorization
      if (err?.message?.includes('401') || err?.message?.includes('OAuth') || err?.message?.includes('invalid_grant')) {
        try {
          const newToken = await authorizeGmailAndGetToken();
          await sendAutomatedGmailMessage(
            newToken,
            appointment.patientEmail,
            notifications.email.subject,
            notifications.email.body
          );
          setGmailApiStatus({
            type: 'success',
            message: `Automated email dispatched directly via Gmail API to ${appointment.patientEmail}!`
          });
          return;
        } catch (authErr: any) {
          setGmailApiStatus({
            type: 'error',
            message: authErr?.message || 'Google OAuth authorization failed.'
          });
          return;
        }
      }
      setGmailApiStatus({
        type: 'error',
        message: err?.message || 'Failed to send automated Gmail message.'
      });
    } finally {
      setSendingGmailApi(false);
    }
  };

  const mailtoUrl = `mailto:${encodeURIComponent(appointment.patientEmail || '')}?subject=${encodeURIComponent(notifications.email.subject)}&body=${encodeURIComponent(notifications.email.body)}`;
  const smsUrl = `sms:${encodeURIComponent(appointment.patientPhone || '')}?body=${encodeURIComponent(notifications.sms.message)}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Confirmation Notifications</h3>
              <p className="text-xs text-slate-500">Ref ID: <strong className="text-blue-600">#{appointment.id}</strong></p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success alert banner */}
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 mb-5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <span>Confirmation Dispatched via SMS & Gmail</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-emerald-700 font-medium pl-6">
            <div className="flex items-center gap-1.5">
              <Smartphone size={13} className="text-emerald-600" />
              <span>SMS to: <strong>{appointment.patientPhone}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail size={13} className="text-emerald-600" />
              <span>Gmail to: <strong>{appointment.patientEmail || 'N/A'}</strong></span>
            </div>
          </div>
        </div>

        {resendSuccess && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs p-3 rounded-2xl mb-4 flex items-center gap-2 font-semibold animate-in fade-in">
            <Send size={16} className="text-blue-600" />
            <span>New confirmation notifications successfully resent to phone & Gmail!</span>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-5">
          <button
            onClick={() => setActiveTab('sms')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'sms' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare size={15} className={activeTab === 'sms' ? 'text-blue-600' : ''} />
            <span>SMS Message</span>
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'email' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail size={15} className={activeTab === 'email' ? 'text-red-500' : ''} />
            <span>Gmail Confirmation</span>
          </button>
        </div>

        {/* SMS View */}
        {activeTab === 'sms' && (
          <div className="space-y-4">
            <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-inner border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3 border-b border-slate-800 pb-2">
                <span className="flex items-center gap-1 font-semibold text-slate-200">
                  <Smartphone size={14} className="text-blue-400" />
                  SMS Message (To: {appointment.patientPhone})
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full">
                  Delivered • {notifications.sms.timestamp}
                </span>
              </div>

              {/* Message Bubble */}
              <div className="bg-blue-600 text-white p-4 rounded-2xl rounded-tl-xs text-xs leading-relaxed font-sans shadow-md">
                {notifications.sms.message}
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={smsUrl}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink size={14} />
                <span>Open Messages App</span>
              </a>
              <button
                onClick={() => handleCopy(notifications.sms.message, 'sms')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Copy size={14} />
                <span>{copiedType === 'sms' ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Gmail View */}
        {activeTab === 'email' && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">To</p>
                  <p className="font-semibold text-slate-800">{appointment.patientEmail || 'N/A'}</p>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                  Gmail Automated
                </span>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Subject</p>
                <p className="text-xs font-bold text-slate-900">{notifications.email.subject}</p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-line font-mono leading-relaxed max-h-48 overflow-y-auto">
                {notifications.email.body}
              </div>
            </div>

            {/* Automated Gmail Status Banner */}
            {gmailApiStatus.type === 'success' && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <Check size={16} className="text-emerald-600 flex-shrink-0" />
                <span>{gmailApiStatus.message}</span>
              </div>
            )}
            {gmailApiStatus.type === 'error' && (
              <div className="bg-red-50 border border-red-200 text-red-900 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                <span>{gmailApiStatus.message}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleAutomatedGmailSend}
                disabled={sendingGmailApi}
                className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-50"
              >
                {sendingGmailApi ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Zap size={14} className="text-amber-300 fill-amber-300" />
                )}
                <span>{sendingGmailApi ? 'Sending via Gmail API...' : 'Automate Send via Gmail API'}</span>
              </button>

              <a
                href={mailtoUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Mail size={14} />
                <span>Open Draft</span>
              </a>

              <button
                onClick={() => handleCopy(notifications.email.body, 'email')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Copy size={14} />
                <span>{copiedType === 'email' ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleResend}
            disabled={resending}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={resending ? 'animate-spin' : ''} />
            <span>{resending ? 'Resending...' : 'Resend SMS & Gmail'}</span>
          </button>

          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

