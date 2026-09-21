import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Brain, 
  Baby, 
  Bone, 
  Activity, 
  Sparkles, 
  Phone, 
  Calendar, 
  Clock, 
  MapPin, 
  User as UserIcon, 
  ChevronRight, 
  CheckCircle2, 
  ShieldCheck, 
  Award, 
  Users, 
  Search, 
  X, 
  Menu, 
  Star, 
  AlertCircle,
  Stethoscope,
  Printer,
  Trash2,
  Building2,
  FileText,
  LogOut,
  LogIn,
  UserCheck,
  Loader2,
  MessageSquare,
  Mail,
  Send,
  Smartphone
} from 'lucide-react';
import { NotificationModal } from './components/NotificationModal';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { DEPARTMENTS, DOCTORS } from './data';
import { Department, Doctor, Appointment, UserProfile } from './types';
import { 
  auth, 
  createAppointmentInFirestore, 
  getUserAppointmentsFromFirestore, 
  deleteAppointmentFromFirestore, 
  getUserProfile 
} from './lib/firebase';
import AuthModal from './components/AuthModal';
import AdminPortal from './components/AdminPortal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'about' | 'departments' | 'doctors' | 'appointments' | 'admin'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'signin' | 'signup'>('signin');

  // Quick booking state
  const [selectedDeptId, setSelectedDeptId] = useState<string>('cardiology');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('doc-saniya');
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-24');
  
  // Booking modal state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingTimeSlot, setBookingTimeSlot] = useState('09:30 AM');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientNotes, setPatientNotes] = useState('');
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [selectedNotifAppt, setSelectedNotifAppt] = useState<Appointment | null>(null);

  // Filter doctor search state
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
  const [doctorDeptFilter, setDoctorDeptFilter] = useState('all');

  // Emergency modal
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);

  // Selected department view modal
  const [activeDepartmentDetail, setActiveDepartmentDetail] = useState<Department | null>(null);

  // Saved appointments local storage + Firestore
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setPatientName(user.displayName || '');
        setPatientEmail(user.email || '');
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setUserProfile(profile);
          if (profile.phone) setPatientPhone(profile.phone);
        }
        // Load user appointments from Firestore
        setLoadingAppointments(true);
        const userAppts = await getUserAppointmentsFromFirestore(user.uid);
        setAppointments(userAppts);
        setLoadingAppointments(false);
      } else {
        setUserProfile(null);
        // Load local storage fallback appointments
        try {
          const saved = localStorage.getItem('wecare_appointments');
          if (saved) {
            setAppointments(JSON.parse(saved));
          } else {
            setAppointments([
              {
                id: 'WC-98214',
                patientName: 'Guest Patient',
                patientPhone: '+1 (555) 019-2834',
                patientEmail: 'guest@example.com',
                departmentName: 'Cardiology',
                doctorName: 'Dr. Saniya',
                date: '2026-10-24',
                timeSlot: '09:30 AM',
                notes: 'Annual cardiovascular checkup.',
                status: 'Confirmed',
                createdAt: new Date().toISOString()
              }
            ]);
          }
        } catch {
          // ignore
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Save to localStorage if guest
  useEffect(() => {
    if (!currentUser && appointments.length > 0) {
      try {
        localStorage.setItem('wecare_appointments', JSON.stringify(appointments));
      } catch {
        // ignore
      }
    }
  }, [appointments, currentUser]);

  // Update selected doctor when department changes in quick booking
  useEffect(() => {
    const availableDocs = DOCTORS.filter(d => d.departmentId === selectedDeptId);
    if (availableDocs.length > 0) {
      setSelectedDoctorId(availableDocs[0].id);
    }
  }, [selectedDeptId]);

  const handleStartBooking = (deptId?: string, docId?: string) => {
    if (deptId) setSelectedDeptId(deptId);
    if (docId) setSelectedDoctorId(docId);
    
    // Prompt login if user is not authenticated
    if (!currentUser) {
      setAuthModalInitialMode('signin');
      setAuthModalOpen(true);
      return;
    }

    setBookingModalOpen(true);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setActiveTab('home');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleConfirmAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !patientPhone) return;

    if (!currentUser) {
      setBookingModalOpen(false);
      setAuthModalInitialMode('signin');
      setAuthModalOpen(true);
      return;
    }

    setSubmittingBooking(true);
    const dept = DEPARTMENTS.find(d => d.id === selectedDeptId);
    const doc = DOCTORS.find(d => d.id === selectedDoctorId);

    const appointmentPayload = {
      userId: currentUser.uid,
      patientName,
      patientPhone,
      patientEmail: patientEmail || currentUser.email || 'N/A',
      departmentName: dept ? dept.name : 'General Medicine',
      doctorName: doc ? doc.name : 'Assigned Specialist',
      date: selectedDate,
      timeSlot: bookingTimeSlot,
      notes: patientNotes,
      status: 'Confirmed' as const,
      createdAt: new Date().toISOString()
    };

    try {
      const savedAppt = await createAppointmentInFirestore(appointmentPayload);
      setAppointments(prev => [savedAppt, ...prev]);
      setConfirmedAppointment(savedAppt);
    } catch (error) {
      console.error('Failed to save to Firestore, falling back to local creation:', error);
      const fallbackAppt: Appointment = {
        ...appointmentPayload,
        id: `WC-${Math.floor(10000 + Math.random() * 90000)}`
      };
      setAppointments(prev => [fallbackAppt, ...prev]);
      setConfirmedAppointment(fallbackAppt);
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      if (currentUser) {
        try {
          await deleteAppointmentFromFirestore(id);
        } catch (err) {
          console.error('Error removing from Firestore:', err);
        }
      }
      setAppointments(prev => prev.filter(a => a.id !== id));
    }
  };

  const getDepartmentIcon = (iconName: string) => {
    switch (iconName) {
      case 'Heart': return <Heart className="w-6 h-6 text-blue-600" />;
      case 'Brain': return <Brain className="w-6 h-6 text-blue-600" />;
      case 'Baby': return <Baby className="w-6 h-6 text-blue-600" />;
      case 'Bone': return <Bone className="w-6 h-6 text-blue-600" />;
      case 'Activity': return <Activity className="w-6 h-6 text-blue-600" />;
      case 'Sparkles': return <Sparkles className="w-6 h-6 text-blue-600" />;
      default: return <Stethoscope className="w-6 h-6 text-blue-600" />;
    }
  };

  const selectedDepartmentObj = DEPARTMENTS.find(d => d.id === selectedDeptId) || DEPARTMENTS[0];
  const filteredDoctorsForQuickBook = DOCTORS.filter(d => d.departmentId === selectedDeptId);

  const filteredDoctorsDirectory = DOCTORS.filter(doc => {
    const matchesDept = doctorDeptFilter === 'all' || doc.departmentId === doctorDeptFilter;
    const matchesQuery = doc.name.toLowerCase().includes(doctorSearchQuery.toLowerCase()) || 
                         doc.departmentName.toLowerCase().includes(doctorSearchQuery.toLowerCase()) ||
                         doc.specialties.some(s => s.toLowerCase().includes(doctorSearchQuery.toLowerCase()));
    return matchesDept && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-700">
      
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-10 flex items-center justify-between shadow-xs">
        <div 
          className="flex items-center gap-2 text-blue-700 font-bold text-xl cursor-pointer select-none"
          onClick={() => setActiveTab('home')}
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-xs">
            WC
          </div>
          <span className="tracking-tight">WeCare <span className="text-slate-400 font-light">Hospitals</span></span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 text-slate-600 text-sm font-medium">
          <button 
            onClick={() => setActiveTab('home')}
            className={`py-5 transition-colors relative ${activeTab === 'home' ? 'text-blue-600 font-semibold border-b-2 border-blue-600' : 'hover:text-blue-600'}`}
          >
            Home
          </button>
          <button 
            onClick={() => setActiveTab('about')}
            className={`py-5 transition-colors relative ${activeTab === 'about' ? 'text-blue-600 font-semibold border-b-2 border-blue-600' : 'hover:text-blue-600'}`}
          >
            About
          </button>
          <button 
            onClick={() => setActiveTab('departments')}
            className={`py-5 transition-colors relative ${activeTab === 'departments' ? 'text-blue-600 font-semibold border-b-2 border-blue-600' : 'hover:text-blue-600'}`}
          >
            Departments
          </button>
          <button 
            onClick={() => setActiveTab('doctors')}
            className={`py-5 transition-colors relative ${activeTab === 'doctors' ? 'text-blue-600 font-semibold border-b-2 border-blue-600' : 'hover:text-blue-600'}`}
          >
            Doctors
          </button>
          <button 
            onClick={() => setActiveTab('appointments')}
            className={`py-5 transition-colors relative flex items-center gap-1.5 ${activeTab === 'appointments' ? 'text-blue-600 font-semibold border-b-2 border-blue-600' : 'hover:text-blue-600'}`}
          >
            My Appointments
            {appointments.length > 0 && (
              <span className="w-5 h-5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center justify-center">
                {appointments.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('admin')}
            className={`py-5 transition-colors relative flex items-center gap-1.5 text-slate-800 ${activeTab === 'admin' ? 'text-blue-600 font-bold border-b-2 border-blue-600' : 'hover:text-blue-600 font-semibold'}`}
          >
            <ShieldCheck size={16} className="text-blue-600" />
            <span>Admin Portal</span>
          </button>

          {/* User Auth state */}
          {currentUser ? (
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-bold border border-blue-200/60">
                <UserCheck size={14} />
                <span className="max-w-[120px] truncate">{currentUser.displayName || currentUser.email}</span>
              </div>
              <button 
                onClick={handleSignOut}
                className="p-1.5 text-slate-400 hover:text-red-600 transition-colors rounded-lg"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
              <button 
                onClick={() => { setAuthModalInitialMode('signin'); setAuthModalOpen(true); }}
                className="text-xs font-bold text-slate-700 hover:text-blue-600 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
              >
                <LogIn size={15} />
                Sign In
              </button>
              <button 
                onClick={() => { setAuthModalInitialMode('signup'); setAuthModalOpen(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-all font-medium shadow-xs text-xs active:scale-95"
              >
                Sign Up
              </button>
            </div>
          )}

          <button 
            onClick={() => handleStartBooking()}
            className="ml-2 bg-slate-900 text-white px-5 py-2 rounded-full hover:bg-slate-800 transition-all font-medium shadow-xs hover:shadow-md text-sm active:scale-95"
          >
            Book Appointment
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          {currentUser ? (
            <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-full truncate max-w-[100px]">
              {currentUser.displayName || 'Patient'}
            </span>
          ) : (
            <button 
              onClick={() => { setAuthModalInitialMode('signin'); setAuthModalOpen(true); }}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-full font-semibold"
            >
              Sign In
            </button>
          )}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 rounded-lg hover:bg-slate-100"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-3 text-sm font-medium animate-in slide-in-from-top-2 duration-150">
          <button 
            onClick={() => { setActiveTab('home'); setMobileMenuOpen(false); }}
            className={`text-left py-2 border-b border-slate-100 ${activeTab === 'home' ? 'text-blue-600 font-bold' : 'text-slate-600'}`}
          >
            Home
          </button>
          <button 
            onClick={() => { setActiveTab('about'); setMobileMenuOpen(false); }}
            className={`text-left py-2 border-b border-slate-100 ${activeTab === 'about' ? 'text-blue-600 font-bold' : 'text-slate-600'}`}
          >
            About
          </button>
          <button 
            onClick={() => { setActiveTab('departments'); setMobileMenuOpen(false); }}
            className={`text-left py-2 border-b border-slate-100 ${activeTab === 'departments' ? 'text-blue-600 font-bold' : 'text-slate-600'}`}
          >
            Departments
          </button>
          <button 
            onClick={() => { setActiveTab('doctors'); setMobileMenuOpen(false); }}
            className={`text-left py-2 border-b border-slate-100 ${activeTab === 'doctors' ? 'text-blue-600 font-bold' : 'text-slate-600'}`}
          >
            Doctors
          </button>
          <button 
            onClick={() => { setActiveTab('appointments'); setMobileMenuOpen(false); }}
            className={`text-left py-2 border-b border-slate-100 flex items-center justify-between ${activeTab === 'appointments' ? 'text-blue-600 font-bold' : 'text-slate-600'}`}
          >
            <span>My Appointments</span>
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">{appointments.length}</span>
          </button>
          <button 
            onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }}
            className={`text-left py-2 border-b border-slate-100 flex items-center gap-2 ${activeTab === 'admin' ? 'text-blue-600 font-bold' : 'text-slate-600'}`}
          >
            <ShieldCheck size={16} className="text-blue-600" />
            <span>Admin Portal</span>
          </button>

          {currentUser ? (
            <div className="py-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Signed in as <strong>{currentUser.email}</strong></span>
              <button onClick={handleSignOut} className="text-red-600 font-bold">Sign Out</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button 
                onClick={() => { setAuthModalInitialMode('signin'); setAuthModalOpen(true); setMobileMenuOpen(false); }}
                className="py-2 text-center text-xs font-bold border border-slate-200 rounded-xl"
              >
                Sign In
              </button>
              <button 
                onClick={() => { setAuthModalInitialMode('signup'); setAuthModalOpen(true); setMobileMenuOpen(false); }}
                className="py-2 text-center text-xs font-bold bg-blue-600 text-white rounded-xl"
              >
                Sign Up
              </button>
            </div>
          )}

          <button 
            onClick={() => { handleStartBooking(); setMobileMenuOpen(false); }}
            className="w-full bg-slate-900 text-white py-2.5 rounded-full font-semibold hover:bg-slate-800 transition-colors text-center mt-2 shadow-xs"
          >
            Book Appointment
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'home' && (
          <div className="flex-1 flex flex-col">
            {/* Hero & Quick Booking Section */}
            <div className="flex-1 flex flex-col lg:flex-row px-4 sm:px-10 py-8 sm:py-12 gap-10 bg-gradient-to-br from-white via-slate-50 to-blue-50/20 max-w-7xl w-full mx-auto">
              
              {/* Left Column */}
              <div className="flex-1 flex flex-col justify-center">
                <span className="text-blue-600 font-semibold tracking-wider text-xs uppercase mb-4 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 inline-block animate-pulse"></span>
                  Compassionate Care for You
                </span>
                
                <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-6 tracking-tight">
                  Advanced Healthcare <br/> 
                  <span className="text-blue-600 underline decoration-slate-200 underline-offset-8">Tailored to Your Life.</span>
                </h1>
                
                <p className="text-slate-500 text-base sm:text-lg mb-8 max-w-lg leading-relaxed">
                  Experience world-class medical expertise and state-of-the-art facilities dedicated to your wellness and recovery.
                </p>
                
                <div className="flex flex-wrap gap-8 sm:gap-10 pt-2 border-t border-slate-200/60">
                  <div className="flex flex-col">
                    <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">150+</span>
                    <span className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-1">Specialists</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">25+</span>
                    <span className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-1">Departments</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">98%</span>
                    <span className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-1">Success Rate</span>
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-4">
                  <button 
                    onClick={() => setActiveTab('doctors')}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-xs"
                  >
                    <Search size={16} />
                    Find a Specialist
                  </button>
                  <button 
                    onClick={() => setActiveTab('departments')}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    View All Departments <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Quick Booking Widget */}
              <div className="w-full lg:w-96 bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 border border-slate-100 flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center justify-between">
                  <span>Quick Appointment</span>
                  <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-sans">
                    24/7 Booking
                  </span>
                </h3>

                <div className="space-y-4 flex-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">Department</label>
                    <select 
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    >
                      {DEPARTMENTS.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">Select Doctor</label>
                    <select 
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    >
                      {filteredDoctorsForQuickBook.map(doc => (
                        <option key={doc.id} value={doc.id}>{doc.name} ({doc.role})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">Preferred Date</label>
                    <input 
                      type="date" 
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <button 
                  onClick={() => handleStartBooking()}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold mt-8 hover:bg-slate-800 tracking-wide transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Calendar size={18} />
                  Schedule Consultation
                </button>
              </div>

            </div>

            {/* Info Grid Section */}
            <div className="bg-slate-100/50 border-t border-slate-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-10 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Department Highlight */}
                <div 
                  onClick={() => setActiveDepartmentDetail(DEPARTMENTS[0])}
                  className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <h4 className="text-xs font-bold text-blue-600 uppercase mb-3 tracking-wider flex items-center justify-between">
                    <span>Featured Department</span>
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Heart className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-base">Cardiovascular Institute</p>
                      <p className="text-xs text-slate-400 font-medium">12 Specialized Surgeons</p>
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm mt-3 leading-relaxed">
                    Lead by Dr. Saniya, specializing in non-invasive robotics and valve repair.
                  </p>
                </div>

                {/* Doctor Highlight */}
                <div 
                  onClick={() => handleStartBooking('neurology', 'doc-chen')}
                  className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <h4 className="text-xs font-bold text-blue-600 uppercase mb-3 tracking-wider flex items-center justify-between">
                    <span>Physician of the Month</span>
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 border border-slate-200">
                      <img 
                        src={DOCTORS[1].avatarUrl} 
                        alt="Dr. Michael Chen" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-base">Dr. Michael Chen</p>
                      <p className="text-xs text-slate-400 font-medium">Chief of Neurology</p>
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm mt-3 leading-relaxed">
                    Expert in neuro-plasticity and degenerative brain disorders with 20+ years experience.
                  </p>
                </div>

                {/* Emergency Contact */}
                <div 
                  onClick={() => setEmergencyModalOpen(true)}
                  className="bg-slate-900 p-6 rounded-2xl text-white shadow-lg cursor-pointer hover:bg-slate-950 transition-colors group relative overflow-hidden"
                >
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-600/10 rounded-full blur-xl"></div>
                  <h4 className="text-xs font-bold text-blue-400 uppercase mb-3 tracking-wider flex items-center justify-between">
                    <span>24/7 Helpline</span>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                  </h4>
                  <p className="text-3xl font-bold mb-2 font-mono tracking-tight text-white group-hover:text-blue-300 transition-colors">
                    0800 700 900
                  </p>
                  <p className="text-slate-400 text-sm mb-4 italic">
                    "Prompt care when seconds count."
                  </p>
                  <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase group-hover:text-blue-300 transition-colors">
                    <span>Emergency Location</span>
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Department Grid Highlight */}
            <div className="bg-white border-t border-slate-200 py-12 px-4 sm:px-10">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-10">
                  <span className="text-blue-600 text-xs font-bold uppercase tracking-wider">Clinical Excellence</span>
                  <h2 className="text-3xl font-bold text-slate-900 mt-1">Specialized Medical Departments</h2>
                  <p className="text-slate-500 text-sm max-w-xl mx-auto mt-2">
                    Our centers of excellence bring together multidisciplinary teams of renowned clinicians and cutting-edge medical technology.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {DEPARTMENTS.map((dept) => (
                    <div 
                      key={dept.id} 
                      className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:bg-white hover:shadow-md transition-all group cursor-pointer"
                      onClick={() => setActiveDepartmentDetail(dept)}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-xs group-hover:border-blue-200">
                          {getDepartmentIcon(dept.iconName)}
                        </div>
                        <span className="text-xs font-semibold text-slate-400 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                          {dept.specialistsCount} Specialists
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {dept.name}
                      </h3>
                      <p className="text-slate-500 text-sm mt-2 line-clamp-2 leading-relaxed">
                        {dept.shortDesc}
                      </p>
                      <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs text-blue-600 font-semibold">
                        <span>Lead: {dept.leadDoctor}</span>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-10 py-12 w-full animate-in fade-in duration-200">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-blue-600 text-xs font-bold uppercase tracking-wider">About WeCare</span>
              <h1 className="text-4xl font-bold text-slate-900 mt-2">Dedicated to Superior Patient Outcomes</h1>
              <p className="text-slate-500 text-base mt-3">
                Since our founding, WeCare Hospitals has set the benchmark for medical excellence, compassionate care, and robotic surgery innovations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <Award size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">JCI Accredited</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Recognized globally for adherence to international hospital safety standards and continuous clinical quality management.
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Patient-Centric Care</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Individualized treatment pathways prioritizing comfort, emotional support, and rapid rehabilitation.
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <Building2 size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Next-Gen Robotics</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Equipped with 4th generation surgical robots enabling pin-point precision, minimal incision size, and faster recovery.
                </p>
              </div>
            </div>

            {/* Leadership & Hospital Info */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-xs flex flex-col md:flex-row gap-10 items-center">
              <div className="flex-1">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Hospital Address & Hours</span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1 mb-4">Visit Our Main Campus</h2>
                <div className="space-y-3 text-slate-600 text-sm">
                  <p className="flex items-start gap-2">
                    <MapPin size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>100 Healthcare Parkway, Medical District, Suite 400</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Clock size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>OPD Consultations: Mon - Sat (08:00 AM - 08:00 PM)</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Phone size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>General Enquiries: +1 (800) 555-CARE / Emergency: 0800 700 900</span>
                  </p>
                </div>
              </div>
              <div className="w-full md:w-80 h-48 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <Building2 size={36} className="text-slate-300 mb-2" />
                <span className="font-bold text-slate-700 text-sm">WeCare Medical Center Campus</span>
                <span className="text-xs text-slate-400 mt-1">Helipad & Emergency Trauma Bay</span>
              </div>
            </div>
          </div>
        )}

        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-10 py-12 w-full animate-in fade-in duration-200">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-blue-600 text-xs font-bold uppercase tracking-wider">Our Specialties</span>
              <h1 className="text-4xl font-bold text-slate-900 mt-2">Clinical Departments</h1>
              <p className="text-slate-500 text-base mt-2">
                Explore our specialized medical institutes equipped with state-of-the-art diagnostic technology and expert surgeons.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {DEPARTMENTS.map((dept) => (
                <div key={dept.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        {getDepartmentIcon(dept.iconName)}
                      </div>
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                        {dept.specialistsCount} Doctors
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-2">{dept.name}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">{dept.fullDesc}</p>

                    <div className="mb-6">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Key Services</span>
                      <ul className="space-y-1.5">
                        {dept.keyServices.map((service, idx) => (
                          <li key={idx} className="text-xs text-slate-600 flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-blue-600" />
                            <span>{service}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Head: {dept.leadDoctor}</span>
                    <button 
                      onClick={() => handleStartBooking(dept.id)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition-colors"
                    >
                      Book Dept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Doctors Tab */}
        {activeTab === 'doctors' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-10 py-12 w-full animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <span className="text-blue-600 text-xs font-bold uppercase tracking-wider">Medical Faculty</span>
                <h1 className="text-4xl font-bold text-slate-900 mt-1">Our Specialists</h1>
                <p className="text-slate-500 text-sm mt-1">Consult with top-rated medical experts and surgeons.</p>
              </div>

              {/* Search and filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search doctor or specialty..."
                    value={doctorSearchQuery}
                    onChange={(e) => setDoctorSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                  />
                </div>

                <select
                  value={doctorDeptFilter}
                  onChange={(e) => setDoctorDeptFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                >
                  <option value="all">All Departments</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredDoctorsDirectory.map((doc) => (
                <div key={doc.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all">
                  <div>
                    <div className="flex items-start gap-4 mb-4">
                      <img 
                        src={doc.avatarUrl} 
                        alt={doc.name} 
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-xs flex-shrink-0"
                      />
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 leading-snug">{doc.name}</h3>
                        <p className="text-xs font-semibold text-blue-600">{doc.role}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{doc.education}</p>
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-500 font-bold">
                          <Star size={14} className="fill-amber-400 text-amber-400" />
                          <span>{doc.rating}</span>
                          <span className="text-slate-400 font-normal">({doc.reviewsCount} reviews)</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-slate-500 text-sm leading-relaxed mb-4">{doc.bio}</p>

                    <div className="mb-4">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Specialties</span>
                      <div className="flex flex-wrap gap-1.5">
                        {doc.specialties.map((s, i) => (
                          <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
                      <Calendar size={14} className="text-blue-600" />
                      <span>Available: {doc.availableDays.join(', ')}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleStartBooking(doc.departmentId, doc.id)}
                    className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 mt-2"
                  >
                    <span>Book Consultation</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-10 py-12 w-full animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-blue-600 text-xs font-bold uppercase tracking-wider">Patient Portal</span>
                <h1 className="text-3xl font-bold text-slate-900 mt-1">My Appointments</h1>
                {currentUser && (
                  <p className="text-slate-500 text-xs mt-0.5">
                    Logged in as <strong className="text-slate-700">{currentUser.email}</strong> • Synchronized with Cloud Database
                  </p>
                )}
              </div>
              <button 
                onClick={() => handleStartBooking()}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-blue-700 shadow-xs transition-colors"
              >
                + New Appointment
              </button>
            </div>

            {loadingAppointments ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center gap-2">
                <Loader2 size={32} className="text-blue-600 animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Loading appointments from cloud database...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <FileText size={48} className="mx-auto text-slate-300 mb-3" />
                <h3 className="text-lg font-bold text-slate-800">No Appointments Scheduled</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1 mb-6">
                  You haven't scheduled any consultations yet. Easily book an appointment with our specialists.
                </p>
                <button 
                  onClick={() => handleStartBooking()}
                  className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800"
                >
                  Schedule Consultation
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((app) => (
                  <div key={app.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-blue-600 text-sm bg-blue-50 px-2.5 py-1 rounded-lg">
                          {app.id}
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 font-semibold text-xs px-2.5 py-1 rounded-full border border-emerald-200/60 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          {app.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm pt-1">
                        <div>
                          <p className="font-bold text-slate-900 text-base">{app.doctorName}</p>
                          <p className="text-xs text-slate-500">{app.departmentName} Department</p>
                        </div>
                        <div className="text-slate-600 text-xs space-y-1">
                          <p className="flex items-center gap-1.5 font-medium text-slate-800">
                            <Calendar size={14} className="text-blue-600" />
                            <span>Date: {app.date}</span>
                          </p>
                          <p className="flex items-center gap-1.5 font-medium text-slate-800">
                            <Clock size={14} className="text-blue-600" />
                            <span>Time Slot: {app.timeSlot}</span>
                          </p>
                        </div>
                      </div>

                      {app.notes && (
                        <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          Note: "{app.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                      <button 
                        onClick={() => setSelectedNotifAppt(app)}
                        className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1.5"
                        title="View SMS & Gmail Notifications"
                      >
                        <MessageSquare size={15} />
                        <span>SMS & Gmail Alerts</span>
                      </button>
                      <button 
                        onClick={() => window.print()}
                        className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1"
                        title="Print Receipt"
                      >
                        <Printer size={16} />
                        <span className="hidden sm:inline">Print</span>
                      </button>
                      <button 
                        onClick={() => handleCancelAppointment(app.id)}
                        className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1"
                        title="Cancel Appointment"
                      >
                        <Trash2 size={16} />
                        <span className="hidden sm:inline">Cancel</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Admin Portal Tab */}
        {activeTab === 'admin' && (
          <AdminPortal currentUser={currentUser} onClose={() => setActiveTab('home')} />
        )}
      </main>

      {/* Appointment Modal */}
      {bookingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            
            {confirmedAppointment ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Appointment Confirmed!</h3>
                <p className="text-slate-500 text-sm mt-1 mb-6">
                  Your appointment booking has been registered and stored in our secure Cloud database.
                </p>

                <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200 text-xs space-y-2 font-mono mb-4">
                  <p><span className="text-slate-400 uppercase font-sans">Booking ID:</span> <strong className="text-blue-600">{confirmedAppointment.id}</strong></p>
                  <p><span className="text-slate-400 uppercase font-sans">Patient:</span> <strong>{confirmedAppointment.patientName}</strong></p>
                  <p><span className="text-slate-400 uppercase font-sans">Doctor:</span> <strong>{confirmedAppointment.doctorName}</strong></p>
                  <p><span className="text-slate-400 uppercase font-sans">Department:</span> <strong>{confirmedAppointment.departmentName}</strong></p>
                  <p><span className="text-slate-400 uppercase font-sans">Schedule:</span> <strong>{confirmedAppointment.date} at {confirmedAppointment.timeSlot}</strong></p>
                </div>

                {/* Dispatch Confirmation Summary Box */}
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-left text-xs mb-6 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                    <span>Confirmation Alerts Dispatched</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 space-y-1 pl-6">
                    <p>• <strong>SMS:</strong> Sent to {confirmedAppointment.patientPhone}</p>
                    <p>• <strong>Gmail:</strong> Sent to {confirmedAppointment.patientEmail || 'N/A'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedNotifAppt(confirmedAppointment)}
                    className="mt-1.5 ml-6 text-xs font-bold text-blue-700 underline hover:text-blue-900 flex items-center gap-1"
                  >
                    <MessageSquare size={13} />
                    <span>View / Resend SMS & Gmail Messages</span>
                  </button>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setConfirmedAppointment(null);
                      setBookingModalOpen(false);
                      setActiveTab('appointments');
                    }}
                    className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800"
                  >
                    View My Appointments
                  </button>
                  <button 
                    onClick={() => {
                      setConfirmedAppointment(null);
                      setBookingModalOpen(false);
                    }}
                    className="bg-slate-100 text-slate-700 px-4 py-3 rounded-xl font-semibold text-sm hover:bg-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase">Step 2 of 2</span>
                    <h3 className="text-xl font-bold text-slate-900">Complete Reservation</h3>
                  </div>
                  <button 
                    onClick={() => setBookingModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleConfirmAppointment} className="space-y-4">
                  <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-xl text-xs text-blue-900 space-y-1">
                    <p className="font-bold">{selectedDepartmentObj.name} Department</p>
                    <p>Consultant: {DOCTORS.find(d => d.id === selectedDoctorId)?.name || 'Assigned Specialist'}</p>
                    <p>Date: {selectedDate}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Time Slot</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['09:00 AM', '10:30 AM', '02:00 PM', '03:45 PM', '05:00 PM'].map((slot) => (
                        <button 
                          key={slot}
                          type="button"
                          onClick={() => setBookingTimeSlot(slot)}
                          className={`py-2 text-xs rounded-xl border font-semibold transition-all ${bookingTimeSlot === slot ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Full Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. John Doe"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone Number *</label>
                    <input 
                      type="tel" 
                      required
                      placeholder="+1 (555) 000-0000"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="john@example.com"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Chief Complaint / Symptoms</label>
                    <textarea 
                      rows={2}
                      placeholder="Describe primary symptoms or reason for visit..."
                      value={patientNotes}
                      onChange={(e) => setPatientNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={submittingBooking}
                    className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold hover:bg-slate-800 transition-colors shadow-md mt-2 flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {submittingBooking && <Loader2 size={18} className="animate-spin" />}
                    <span>Confirm Booking</span>
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Emergency Modal */}
      {emergencyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-800 animate-in zoom-in-95 duration-150 relative">
            <button 
              onClick={() => setEmergencyModalOpen(false)}
              className="absolute right-6 top-6 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              24/7 Emergency Dispatch
            </span>
            <h3 className="text-2xl font-bold mt-1 mb-4">Urgent Medical Triage</h3>

            <div className="bg-slate-800/80 rounded-2xl p-5 mb-6 border border-slate-700/80">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Helpline Phone Number</p>
              <a href="tel:0800700900" className="text-3xl font-mono font-bold text-blue-400 hover:underline">
                0800 700 900
              </a>
              <p className="text-xs text-slate-400 mt-2">
                Average Call Response: <strong className="text-white">&lt; 15 seconds</strong>
              </p>
            </div>

            <div className="space-y-3 text-sm text-slate-300 mb-6">
              <p className="flex items-start gap-2">
                <MapPin size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <span><strong>Emergency ER Gate:</strong> Gate B, 100 Healthcare Parkway, Medical District</span>
              </p>
              <p className="flex items-start gap-2">
                <Clock size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <span><strong>Current ER Wait Time:</strong> ~ 8 minutes</span>
              </p>
            </div>

            <div className="flex gap-3">
              <a 
                href="tel:0800700900" 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-2xl font-bold text-center transition-colors text-sm"
              >
                Call Hotline Now
              </a>
              <button 
                onClick={() => setEmergencyModalOpen(false)}
                className="bg-slate-800 text-slate-300 hover:bg-slate-700 px-5 py-3.5 rounded-2xl font-semibold text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Department Detail Modal */}
      {activeDepartmentDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-150">
            <button 
              onClick={() => setActiveDepartmentDetail(null)}
              className="absolute right-6 top-6 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                {getDepartmentIcon(activeDepartmentDetail.iconName)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{activeDepartmentDetail.name}</h3>
                <p className="text-xs text-slate-400">{activeDepartmentDetail.specialistsCount} Resident Specialists</p>
              </div>
            </div>

            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              {activeDepartmentDetail.fullDesc}
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-6 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Key Procedures & Capabilities</h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                {activeDepartmentDetail.keyServices.map((service, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-blue-600 flex-shrink-0" />
                    <span>{service}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                <span className="block font-semibold text-slate-800">Lead Surgeon</span>
                <span>{activeDepartmentDetail.leadDoctor}</span>
              </div>
              <button 
                onClick={() => {
                  const deptId = activeDepartmentDetail.id;
                  setActiveDepartmentDetail(null);
                  handleStartBooking(deptId);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-xs"
              >
                Book Department
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal 
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalInitialMode}
      />

      {/* SMS / Gmail Notification Modal */}
      <NotificationModal 
        appointment={selectedNotifAppt} 
        isOpen={!!selectedNotifAppt} 
        onClose={() => setSelectedNotifAppt(null)} 
      />

      {/* Clean Minimalist Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-8 px-4 sm:px-10 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center text-white text-xs font-bold">WC</div>
            <span className="font-semibold text-slate-700">WeCare Hospitals Center of Excellence</span>
          </div>
          <p>© {new Date().getFullYear()} WeCare Hospitals. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
