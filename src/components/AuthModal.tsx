import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup 
} from 'firebase/auth';
import { X, Mail, Lock, User as UserIcon, Phone, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { auth, createUserProfile } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'signin' | 'signup';
}

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await createUserProfile(result.user);
      setGoogleLoading(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setGoogleLoading(false);
      console.error('Google Auth error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google Sign-In failed. Please try again.');
      }
    }
  };

  const handleDemoSignIn = async () => {
    setError('');
    setLoading(true);
    const demoEmail = 'demo.patient@wecare.org';
    const demoPassword = 'Password123!';
    try {
      let userCred;
      try {
        userCred = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      } catch (e: any) {
        if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found') {
          userCred = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
          await updateProfile(userCred.user, { displayName: 'Demo Patient' });
          await createUserProfile(userCred.user, { displayName: 'Demo Patient', phone: '+1 (555) 019-2834' });
        } else {
          throw e;
        }
      }
      setLoading(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setLoading(false);
      console.error('Demo auth error:', err);
      setError('Could not sign in with demo account. Please try standard sign-up.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!displayName.trim()) {
          setError('Please enter your full name.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
        await createUserProfile(userCredential.user, { displayName, phone });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      
      setLoading(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setLoading(false);
      console.error('Auth error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        if (mode === 'signin') {
          setError('Invalid email or password. If you do not have an account yet, please create an account.');
        } else {
          setError('Authentication failed. Please check your inputs.');
        }
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters long.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-150">
        <button 
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X size={20} />
        </button>

        <div className="mb-6">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Patient Portal</span>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">
            {mode === 'signup' ? 'Create Your Account' : 'Sign In to WeCare'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {mode === 'signup' 
              ? 'Register to book appointments, track medical history, and manage consultations.' 
              : 'Sign in to access your appointment records and book consultations.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-2xl text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
            {mode === 'signin' && (
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(''); }}
                className="text-xs font-bold text-blue-700 underline hover:text-blue-900 ml-6 block"
              >
                No account? Click here to Create an Account
              </button>
            )}
            {mode === 'signup' && error.includes('already exists') && (
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(''); }}
                className="text-xs font-bold text-blue-700 underline hover:text-blue-900 ml-6 block"
              >
                Already registered? Click here to Sign In
              </button>
            )}
          </div>
        )}

        {/* Quick Demo Login Option */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleDemoSignIn}
            disabled={loading || googleLoading}
            className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Sparkles size={15} className="text-blue-600" />
            <span>Quick Sign In as Demo Patient</span>
          </button>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400 font-semibold">Or use email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Full Name *</label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone Number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="tel" 
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email Address *</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input 
                type="email" 
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Password *</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || googleLoading}
            className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            <span>{mode === 'signup' ? 'Create Account & Continue' : 'Sign In'}</span>
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
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
            <span>Sign in with Google</span>
          </button>
        </div>

        <div className="mt-4 text-center text-xs text-slate-500">
          {mode === 'signup' ? (
            <p>
              Already have an account?{' '}
              <button 
                onClick={() => { setMode('signin'); setError(''); }}
                className="text-blue-600 font-bold hover:underline"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Don't have an account yet?{' '}
              <button 
                onClick={() => { setMode('signup'); setError(''); }}
                className="text-blue-600 font-bold hover:underline"
              >
                Create an Account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

