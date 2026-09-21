export interface Doctor {
  id: string;
  name: string;
  role: string;
  departmentId: string;
  departmentName: string;
  experience: string;
  bio: string;
  rating: number;
  reviewsCount: number;
  availableDays: string[];
  avatarUrl: string;
  education: string;
  specialties: string[];
}

export interface Department {
  id: string;
  name: string;
  shortDesc: string;
  fullDesc: string;
  specialistsCount: number;
  iconName: string;
  leadDoctor: string;
  keyServices: string[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  userId?: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  departmentName: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  notes?: string;
  status: 'Confirmed' | 'Pending' | 'Completed';
  createdAt: string;
}
