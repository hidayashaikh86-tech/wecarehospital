import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User 
} from 'firebase/auth';
import { 
  initializeFirestore,
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Appointment, UserProfile } from '../types';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const configAny = firebaseConfig as any;
export const db = configAny.firestoreDatabaseId && configAny.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, configAny.firestoreDatabaseId)
  : getFirestore(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  
  // If it's a transient connection closing or offline warning, log as warning
  if (message.includes('closing') || message.includes('hidden') || message.includes('unavailable') || message.includes('offline') || message.includes('client is offline')) {
    console.warn(`Firestore transient notice [${operationType}] on path ${path}:`, message);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User Profile Helpers
export async function createUserProfile(user: User, additionalData?: { displayName?: string; phone?: string }) {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: additionalData?.displayName || user.displayName || 'Patient',
        phone: additionalData?.phone || '',
        createdAt: new Date().toISOString()
      };

      await setDoc(userRef, profile);
    }
  } catch (error: any) {
    console.warn('Managing user profile in Firestore notice (offline or transient):', error?.message || error);
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userRef);
    if (snapshot.exists()) {
      return snapshot.data() as UserProfile;
    }
  } catch (error: any) {
    console.warn('Firestore offline or error fetching user profile, using local fallback:', error?.message || error);
    if (auth.currentUser && auth.currentUser.uid === uid) {
      return {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email || '',
        displayName: auth.currentUser.displayName || 'Patient',
        phone: '',
        createdAt: new Date().toISOString()
      };
    }
  }
  return null;
}

// Appointments Firestore Helpers
export async function createAppointmentInFirestore(appointment: Omit<Appointment, 'id'> & { userId: string }): Promise<Appointment> {
  try {
    const colRef = collection(db, 'appointments');
    const docRef = await addDoc(colRef, appointment);
    return {
      ...appointment,
      id: docRef.id
    };
  } catch (error: any) {
    console.warn('Notice creating appointment in Firestore (using local fallback ID):', error?.message || error);
    const fallbackId = `WC-${Math.floor(10000 + Math.random() * 90000)}`;
    const fallbackAppt: Appointment = {
      ...appointment,
      id: fallbackId
    };
    try {
      const saved = localStorage.getItem(`wecare_user_appts_${appointment.userId}`);
      const existing = saved ? JSON.parse(saved) : [];
      localStorage.setItem(`wecare_user_appts_${appointment.userId}`, JSON.stringify([fallbackAppt, ...existing]));
    } catch {}
    return fallbackAppt;
  }
}

export async function getUserAppointmentsFromFirestore(userId: string): Promise<Appointment[]> {
  try {
    const colRef = collection(db, 'appointments');
    const q = query(colRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const list: Appointment[] = [];
    snapshot.forEach((d) => {
      list.push({
        ...(d.data() as Omit<Appointment, 'id'>),
        id: d.id
      });
    });
    const sorted = list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    try {
      localStorage.setItem(`wecare_user_appts_${userId}`, JSON.stringify(sorted));
    } catch {}
    return sorted;
  } catch (error: any) {
    console.warn('Firestore offline or error fetching user appointments:', error?.message || error);
    try {
      const saved = localStorage.getItem(`wecare_user_appts_${userId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }
}

export async function deleteAppointmentFromFirestore(appointmentId: string): Promise<void> {
  try {
    const docRef = doc(db, 'appointments', appointmentId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting appointment from Firestore:', error);
    handleFirestoreError(error, OperationType.DELETE, `appointments/${appointmentId}`);
    throw error;
  }
}

export async function seedSampleAppointmentsInFirestore(): Promise<Appointment[]> {
  const seedItems: (Omit<Appointment, 'id'> & { userId: string })[] = [
    {
      userId: 'seed-patient-1',
      patientName: 'Johnathan Miller',
      patientPhone: '+1 (555) 234-5678',
      patientEmail: 'j.miller@example.com',
      departmentName: 'Cardiovascular Institute',
      doctorName: 'Dr. Saniya',
      date: '2026-10-24',
      timeSlot: '09:30 AM',
      notes: 'Routine cardiovascular evaluation and blood pressure tracking.',
      status: 'Confirmed',
      createdAt: new Date().toISOString()
    },
    {
      userId: 'seed-patient-2',
      patientName: 'Elena Rostova',
      patientPhone: '+1 (555) 876-5432',
      patientEmail: 'elena.r@example.com',
      departmentName: 'Neurology & Brain Spine',
      doctorName: 'Dr. Marcus Vance',
      date: '2026-10-25',
      timeSlot: '11:00 AM',
      notes: 'Migraine specialist consultation and MRI results discussion.',
      status: 'Pending',
      createdAt: new Date().toISOString()
    },
    {
      userId: 'seed-patient-3',
      patientName: 'Robert Chen',
      patientPhone: '+1 (555) 432-1098',
      patientEmail: 'rchen@example.com',
      departmentName: 'Orthopedics & Joint Care',
      doctorName: 'Dr. David Kim',
      date: '2026-10-26',
      timeSlot: '02:30 PM',
      notes: 'Post-knee operation follow-up assessment.',
      status: 'Confirmed',
      createdAt: new Date().toISOString()
    }
  ];

  const createdList: Appointment[] = [];
  for (const item of seedItems) {
    try {
      const created = await createAppointmentInFirestore(item);
      createdList.push(created);
    } catch (err) {
      console.warn('Could not seed item:', err);
    }
  }
  return createdList;
}

export async function getAllAppointmentsFromFirestore(): Promise<Appointment[]> {
  try {
    const colRef = collection(db, 'appointments');
    const snapshot = await getDocs(colRef);
    const list: Appointment[] = [];
    snapshot.forEach((d) => {
      list.push({
        ...(d.data() as Omit<Appointment, 'id'>),
        id: d.id
      });
    });

    if (list.length === 0) {
      console.log('No appointments in Firestore. Seeding sample appointments...');
      return await seedSampleAppointmentsInFirestore();
    }

    const sorted = list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    try {
      localStorage.setItem('wecare_admin_appts', JSON.stringify(sorted));
    } catch {}

    return sorted;
  } catch (error: any) {
    console.warn('Firestore offline or error fetching all appointments:', error?.message || error);
    try {
      const saved = localStorage.getItem('wecare_admin_appts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }
}

export async function updateAppointmentStatusInFirestore(appointmentId: string, status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled'): Promise<void> {
  try {
    const docRef = doc(db, 'appointments', appointmentId);
    await updateDoc(docRef, { status });
  } catch (error) {
    console.error('Error updating appointment status in Firestore:', error);
    handleFirestoreError(error, OperationType.UPDATE, `appointments/${appointmentId}`);
    throw error;
  }
}

export async function authorizeGmailAndGetToken(): Promise<string> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/gmail.send');
  
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken;
  if (token) {
    localStorage.setItem('wecare_gmail_access_token', token);
    return token;
  }
  throw new Error('Google OAuth succeeded but no access token returned.');
}

export function getStoredGmailAccessToken(): string | null {
  return localStorage.getItem('wecare_gmail_access_token');
}


