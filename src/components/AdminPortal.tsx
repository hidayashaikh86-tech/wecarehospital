import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Search, 
  Plus, 
  Calendar, 
  Clock, 
  User as UserIcon, 
  Phone, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Trash2, 
  RefreshCw, 
  Printer, 
  Filter, 
  LogOut, 
  Loader2, 
  ChevronRight,
  UserCheck,
  Building2,
  Stethoscope,
  Sparkles,
  MessageSquare,
  Smartphone,
  Send
} from 'lucide-react';
import { NotificationModal } from './NotificationModal';
import { 
  auth, 
  getAllAppointmentsFromFirestore, 
  updateAppointmentStatusInFirestore, 
  deleteAppointmentFromFirestore, 
  createAppointmentInFirestore,
  createUserProfile,
  seedSampleAppointmentsInFirestore
} from '../lib/firebase';
import { DEPARTMENTS, DOCTORS } from '../data';
import { Appointment } from '../types';

const ADMIN_EMAILS = ['behlimmohsin06@gmail.com', 'dpmaster529@gmail.com'];
const ADMIN_EMAIL = 'behlimmohsin06@gmail.com';
const ADMIN_DEFAULT_PASS = 'mohsin06';

interface AdminPortalProps {
  currentUser: User | null;
  onClose?: () => void;
}

export default function AdminPortal({ currentUser, onClose }: AdminPortalProps) {
  const [emailInput, setEmailInput] = useState(ADMIN_EMAIL);
  const [passwordInput, setPasswordInput] = useState(ADMIN_DEFAULT_PASS);
  const [authError, setAuthError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSendReset = async () => {
    setAuthError('');
    setResetMessage('');
    const targetEmail = emailInput.trim().toLowerCase() || ADMIN_EMAIL;
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setResetMessage(`Password reset link sent to ${targetEmail}. Please check your inbox.`);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setAuthError(`Could not send password reset email to ${targetEmail}. Please try Google Sign-In.`);
    }
  };

  const handleGoogleAdminLogin = async () => {
    setAuthError('');
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email?.toLowerCase() || '';
      if (!ADMIN_EMAILS.includes(email)) {
        setAuthError(`Access Denied. Account (${result.user.email}) is not an authorized admin email.`);
        await signOut(auth);
      } else {
        await createUserProfile(result.user, { displayName: 'Hospital Admin' });
      }
    } catch (err: any) {
      console.error('Google Admin Sign-in Error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError(err.message || 'Google Sign-In failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Admin Appointments state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Add new booking modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newDeptId, setNewDeptId] = useState(DEPARTMENTS[0].id);
  const [newDoctorId, setNewDoctorId] = useState(DOCTORS[0].id);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTimeSlot, setNewTimeSlot] = useState('10:00 AM');
  const [newNotes, setNewNotes] = useState('');
  const [newStatus, setNewStatus] = useState<'Confirmed' | 'Pending'>('Confirmed');

  // Selected appointment details modal
  const [selectedApptDetail, setSelectedApptDetail] = useState<Appointment | null>(null);
  // Notification modal target
  const [selectedNotifAppt, setSelectedNotifAppt] = useState<Appointment | null>(null);
  const [notifToast, setNotifToast] = useState<string | null>(null);

  const isAdmin = currentUser && ADMIN_EMAILS.includes(currentUser.email?.toLowerCase() || '');

  // Load appointments if user is admin
  useEffect(() => {
    if (isAdmin) {
      loadAdminAppointments();
    }
  }, [isAdmin]);

  // Sync selected doctor when department changes in Add modal
  useEffect(() => {
    const docs = DOCTORS.filter(d => d.departmentId === newDeptId);
    if (docs.length > 0) {
      setNewDoctorId(docs[0].id);
    }
  }, [newDeptId]);

  const loadAdminAppointments = async () => {
    setLoadingAppts(true);
    try {
      const data = await getAllAppointmentsFromFirestore();
      setAppointments(data);
    } catch (err) {
      console.error('Error fetching admin appointments:', err);
    } finally {
      setLoadingAppts(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const cleanEmail = emailInput.trim().toLowerCase();

    if (!ADMIN_EMAILS.includes(cleanEmail)) {
      setAuthError(`Access Denied. '${cleanEmail}' is not an authorized admin email address.`);
      setAuthLoading(false);
      return;
    }

    try {
      let userCred;
      try {
        userCred = await signInWithEmailAndPassword(auth, cleanEmail, passwordInput);
      } catch (err: any) {
        // If signIn fails, try auto-creating if user doesn't exist yet
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
          try {
            userCred = await createUserWithEmailAndPassword(auth, cleanEmail, passwordInput);
            await updateProfile(userCred.user, { displayName: 'Hospital Admin' });
            await createUserProfile(userCred.user, { displayName: 'Hospital Admin', phone: '+1 (800) 555-CARE' });
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              throw new Error('Incorrect password for the admin account. If you forgot your password, click "Forgot / Reset?" or use Google Sign-In.');
            } else {
              throw createErr;
            }
          }
        } else {
          throw err;
        }
      }

      const userEmail = userCred.user.email?.toLowerCase() || '';
      if (!ADMIN_EMAILS.includes(userEmail)) {
        setAuthError('Access Denied. Only authorized admin emails are permitted.');
        await signOut(auth);
      }
    } catch (err: any) {
      console.error('Admin Auth Error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setAuthError('Incorrect password for admin account. Use "Forgot / Reset?" or sign in via Google.');
      } else {
        setAuthError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleStatusChange = async (appointmentId: string, status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled') => {
    try {
      await updateAppointmentStatusInFirestore(appointmentId, status);
      setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status } : a));
      if (selectedApptDetail?.id === appointmentId) {
        setSelectedApptDetail(prev => prev ? { ...prev, status } : null);
      }
      setNotifToast(`Status updated to '${status}'. Confirmation notification sent via SMS & Gmail!`);
      setTimeout(() => setNotifToast(null), 4000);
    } catch (err) {
      alert('Failed to update status. Please check connection.');
    }
  };

  const handleDeleteAppt = async (appointmentId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this appointment record?')) {
      try {
        await deleteAppointmentFromFirestore(appointmentId);
        setAppointments(prev => prev.filter(a => a.id !== appointmentId));
        if (selectedApptDetail?.id === appointmentId) {
          setSelectedApptDetail(null);
        }
      } catch (err) {
        alert('Failed to delete appointment.');
      }
    }
  };

  const handleSeedData = async () => {
    setLoadingAppts(true);
    try {
      const seeded = await seedSampleAppointmentsInFirestore();
      if (seeded.length > 0) {
        setAppointments(prev => [...seeded, ...prev]);
        alert(`Successfully added ${seeded.length} sample records to Firebase Firestore!`);
      } else {
        alert('Could not seed data. Check network or console log.');
      }
    } catch (err) {
      console.error('Error seeding data:', err);
      alert('Error seeding data into Firestore.');
    } finally {
      setLoadingAppts(false);
    }
  };

  const handleCreateNewBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName || !newPatientPhone) return;

    setSubmitting(true);
    const deptObj = DEPARTMENTS.find(d => d.id === newDeptId);
    const docObj = DOCTORS.find(d => d.id === newDoctorId);

    const payload = {
      userId: currentUser?.uid || 'ADMIN_ADDED',
      patientName: newPatientName,
      patientPhone: newPatientPhone,
      patientEmail: newPatientEmail || 'N/A',
      departmentName: deptObj ? deptObj.name : 'General Medicine',
      doctorName: docObj ? docObj.name : 'Assigned Specialist',
      date: newDate,
      timeSlot: newTimeSlot,
      notes: newNotes,
      status: newStatus,
      createdAt: new Date().toISOString()
    };

    try {
      const created = await createAppointmentInFirestore(payload);
      setAppointments(prev => [created, ...prev]);
      setShowAddModal(false);
      // Reset form
      setNewPatientName('');
      setNewPatientEmail('');
      setNewPatientPhone('');
      setNewNotes('');
    } catch (err) {
      alert('Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered appointments
  const filteredAppointments = appointments.filter(a => {
    const matchesStatus = statusFilter === 'All' || a.status.toLowerCase() === statusFilter.toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      a.patientName.toLowerCase().includes(q) ||
      a.patientPhone.toLowerCase().includes(q) ||
      a.patientEmail.toLowerCase().includes(q) ||
      a.doctorName.toLowerCase().includes(q) ||
      a.departmentName.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  // Calculate statistics
  const totalCount = appointments.length;
  const confirmedCount = appointments.filter(a => a.status === 'Confirmed').length;
  const pendingCount = appointments.filter(a => a.status === 'Pending').length;
  const completedCount = appointments.filter(a => a.status === 'Completed').length;
  const cancelledCount = appointments.filter(a => a.status === 'Cancelled').length;

  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-200">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <ShieldCheck size={26} className="text-blue-400" />
          </div>

          <div className="text-center mb-6">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Restricted Area</span>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">Admin Portal Login</h2>
            <p className="text-slate-500 text-xs mt-1">
              Authorized hospital management access only.
            </p>
          </div>

          {authError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-600" />
                <span>{authError}</span>
              </div>
              <div className="pt-1 flex flex-col gap-1.5 pl-6">
                <button
                  type="button"
                  onClick={handleSendReset}
                  className="text-left text-xs font-bold text-blue-700 underline hover:text-blue-900"
                >
                  Send Password Reset Email to {ADMIN_EMAIL}
                </button>
                <button
                  type="button"
                  onClick={handleGoogleAdminLogin}
                  className="text-left text-xs font-bold text-slate-800 underline hover:text-blue-600"
                >
                  Or Sign In with Google ({ADMIN_EMAIL})
                </button>
              </div>
            </div>
          )}

          {resetMessage && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-emerald-600" />
              <span>{resetMessage}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Admin Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input 
                  type="email" 
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Admin Password</label>
                <button
                  type="button"
                  onClick={handleSendReset}
                  className="text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  Forgot / Reset?
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input 
                  type="password" 
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading || googleLoading}
              className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
            >
              {authLoading && <Loader2 size={18} className="animate-spin" />}
              <span>Authenticate Admin Access</span>
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleGoogleAdminLogin}
              disabled={googleLoading || authLoading}
              className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
            >
              {googleLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              )}
              <span>Sign in as Admin with Google</span>
            </button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-[11px] text-slate-400">
              Configured Admin Email: <span className="font-mono text-slate-600 font-semibold">{ADMIN_EMAIL}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 w-full animate-in fade-in duration-200 space-y-6">
      
      {/* Admin Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-blue-600 text-white text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full">
              Hospital Management System
            </span>
            <span className="text-xs text-slate-400 font-mono">v2.4</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Booking Portal</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Welcome back, <strong className="text-white">{currentUser.displayName || 'Chief Admin'}</strong> ({currentUser.email})
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
          >
            <Plus size={18} />
            <span>+ Add New Booking</span>
          </button>
          
          <button
            onClick={loadAdminAppointments}
            disabled={loadingAppts}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl transition-colors"
            title="Refresh Bookings from Firebase"
          >
            <RefreshCw size={18} className={loadingAppts ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleSeedData}
            disabled={loadingAppts}
            className="p-3 bg-slate-800 hover:bg-emerald-900/50 text-slate-300 hover:text-emerald-300 rounded-2xl transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Seed Sample Records into Firebase"
          >
            <Sparkles size={16} className="text-emerald-400" />
            <span className="hidden lg:inline">Seed Sample Data</span>
          </button>

          <button
            onClick={() => signOut(auth)}
            className="p-3 bg-slate-800 hover:bg-red-900/50 text-slate-300 hover:text-red-300 rounded-2xl transition-colors"
            title="Sign Out Admin"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Bookings</span>
          <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">{totalCount}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">Confirmed</span>
          <span className="text-2xl font-bold text-emerald-700 font-mono mt-1 block">{confirmedCount}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">Pending</span>
          <span className="text-2xl font-bold text-amber-700 font-mono mt-1 block">{pendingCount}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">Completed</span>
          <span className="text-2xl font-bold text-blue-700 font-mono mt-1 block">{completedCount}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-red-600 uppercase tracking-wider block">Cancelled</span>
          <span className="text-2xl font-bold text-red-700 font-mono mt-1 block">{cancelledCount}</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
        
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search patient, phone, doctor, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto text-xs font-semibold">
          {['All', 'Confirmed', 'Pending', 'Completed', 'Cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                statusFilter === status 
                  ? 'bg-white text-slate-900 shadow-xs font-bold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <button 
          onClick={() => window.print()}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 ml-auto md:ml-0"
        >
          <Printer size={15} />
          <span>Print Schedule</span>
        </button>

      </div>

      {/* Bookings Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loadingAppts ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 size={32} className="text-blue-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Fetching real-time patient appointments from Cloud Firestore...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No appointments found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Appt ID</th>
                  <th className="p-4">Patient Details</th>
                  <th className="p-4">Specialist & Dept</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono font-bold text-blue-600">
                      {appt.id}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900 text-sm">{appt.patientName}</p>
                      <p className="text-[11px] text-slate-500">{appt.patientPhone}</p>
                      <p className="text-[11px] text-slate-400">{appt.patientEmail}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-slate-800">{appt.doctorName}</p>
                      <p className="text-[11px] text-slate-500">{appt.departmentName}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-slate-800 flex items-center gap-1">
                        <Calendar size={13} className="text-blue-600" />
                        {appt.date}
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock size={13} className="text-blue-600" />
                        {appt.timeSlot}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        appt.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        appt.status === 'Completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        appt.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedNotifAppt(appt)}
                        className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                        title="View / Send SMS & Gmail Notifications"
                      >
                        <MessageSquare size={13} className="text-blue-600" />
                        <span className="hidden xl:inline">SMS & Email</span>
                      </button>
                      {appt.status !== 'Completed' && (
                        <button
                          onClick={() => handleStatusChange(appt.id, 'Completed')}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[11px] font-bold transition-colors"
                          title="Mark Completed"
                        >
                          Complete
                        </button>
                      )}
                      {appt.status !== 'Confirmed' && appt.status !== 'Completed' && (
                        <button
                          onClick={() => handleStatusChange(appt.id, 'Confirmed')}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-bold transition-colors"
                          title="Confirm Appointment"
                        >
                          Confirm
                        </button>
                      )}
                      {appt.status !== 'Cancelled' && (
                        <button
                          onClick={() => handleStatusChange(appt.id, 'Cancelled')}
                          className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-[11px] font-bold transition-colors"
                          title="Cancel Appointment"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAppt(appt.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                        title="Delete Record"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add New Booking Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <XCircle size={22} />
            </button>

            <div className="mb-6">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Admin Action</span>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">Schedule Patient Booking</h2>
              <p className="text-slate-500 text-xs mt-1">
                Directly register an appointment into the hospital database on behalf of a patient.
              </p>
            </div>

            <form onSubmit={handleCreateNewBooking} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-500 uppercase mb-1">Patient Full Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Sarah Connor"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-500 uppercase mb-1">Phone Number *</label>
                  <input 
                    type="tel" 
                    required
                    placeholder="+1 (555) 000-0000"
                    value={newPatientPhone}
                    onChange={(e) => setNewPatientPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-500 uppercase mb-1">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="patient@example.com"
                    value={newPatientEmail}
                    onChange={(e) => setNewPatientEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-500 uppercase mb-1">Department</label>
                  <select 
                    value={newDeptId}
                    onChange={(e) => setNewDeptId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-500 uppercase mb-1">Assigned Doctor</label>
                  <select 
                    value={newDoctorId}
                    onChange={(e) => setNewDoctorId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  >
                    {DOCTORS.filter(doc => doc.departmentId === newDeptId).map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-500 uppercase mb-1">Date</label>
                  <input 
                    type="date" 
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-500 uppercase mb-1">Time Slot</label>
                  <select 
                    value={newTimeSlot}
                    onChange={(e) => setNewTimeSlot(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  >
                    {['09:00 AM', '09:30 AM', '10:00 AM', '11:00 AM', '01:30 PM', '02:30 PM', '04:00 PM'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-500 uppercase mb-1">Initial Status</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input 
                      type="radio" 
                      name="status" 
                      value="Confirmed" 
                      checked={newStatus === 'Confirmed'} 
                      onChange={() => setNewStatus('Confirmed')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Confirmed</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input 
                      type="radio" 
                      name="status" 
                      value="Pending" 
                      checked={newStatus === 'Pending'} 
                      onChange={() => setNewStatus('Pending')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Pending</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-500 uppercase mb-1">Medical Notes / Directives</label>
                <textarea 
                  rows={3}
                  placeholder="e.g. Patient requested morning slot. Fasting required for blood work."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
              >
                {submitting && <Loader2 size={18} className="animate-spin" />}
                <span>Create Booking in Cloud Database</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notifToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <Send size={16} className="text-emerald-400" />
          <span>{notifToast}</span>
        </div>
      )}

      {/* SMS / Gmail Notification Modal */}
      <NotificationModal 
        appointment={selectedNotifAppt} 
        isOpen={!!selectedNotifAppt} 
        onClose={() => setSelectedNotifAppt(null)} 
      />

    </div>
  );
}
