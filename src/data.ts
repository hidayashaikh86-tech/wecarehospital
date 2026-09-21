import { Department, Doctor } from './types';

export const DEPARTMENTS: Department[] = [
  {
    id: 'cardiology',
    name: 'Cardiology',
    shortDesc: 'Lead by Dr. Saniya, specializing in non-invasive robotics and valve repair.',
    fullDesc: 'The Cardiovascular Institute at WeCare delivers comprehensive cardiac care ranging from non-invasive diagnostic procedures to advanced robotic-assisted cardiac surgeries.',
    specialistsCount: 12,
    iconName: 'Heart',
    leadDoctor: 'Dr. Saniya',
    keyServices: ['Robotic Valve Repair', 'Coronary Angioplasty', 'Arrhythmia Management', 'Non-Invasive Diagnostics']
  },
  {
    id: 'neurology',
    name: 'Neurology',
    shortDesc: 'Expert care in neuro-plasticity, stroke recovery, and degenerative brain disorders.',
    fullDesc: 'Our Department of Neurology offers cutting-edge treatment protocols for complex neurological disorders, movement disorders, and neuro-rehabilitation.',
    specialistsCount: 8,
    iconName: 'Brain',
    leadDoctor: 'Dr. Michael Chen',
    keyServices: ['Stroke Emergency Unit', 'Neuro-Plasticity Rehab', 'Epilepsy Monitoring', 'Memory & Dementia Care']
  },
  {
    id: 'pediatrics',
    name: 'Pediatrics',
    shortDesc: 'Gentle, child-centered care from neonatal care to adolescent wellness.',
    fullDesc: 'Dedicated pediatric wing with child-friendly amenities, 24/7 emergency pediatric subspecialists, and compassionate care environments.',
    specialistsCount: 10,
    iconName: 'Baby',
    leadDoctor: 'Dr. Emily Vance',
    keyServices: ['Neonatal Intensive Care (NICU)', 'Pediatric Surgery', 'Immunization & Growth Tracking', 'Child Behavioral Health']
  },
  {
    id: 'orthopedics',
    name: 'Orthopedics',
    shortDesc: 'Pioneering joint replacement, sports injury rehab, and spine reconstruction.',
    fullDesc: 'State-of-the-art orthopedic center specializing in minimally invasive joint replacements, sports trauma medicine, and spinal alignments.',
    specialistsCount: 9,
    iconName: 'Bone',
    leadDoctor: 'Dr. Robert Wilson',
    keyServices: ['Robotic Knee & Hip Replacement', 'Spine Reconstruction', 'Sports Medicine Rehab', 'Fracture Emergency Unit']
  },
  {
    id: 'oncology',
    name: 'Oncology',
    shortDesc: 'Comprehensive cancer treatment combining immunotherapy and targeted diagnostics.',
    fullDesc: 'Providing empathetic, multi-disciplinary cancer care with genetic screening, targeted chemotherapy, and radiation precision.',
    specialistsCount: 7,
    iconName: 'Activity',
    leadDoctor: 'Dr. James Thorne',
    keyServices: ['Precision Immunotherapy', 'Surgical Oncology', 'Radiation Therapy', 'Genetic Cancer Screening']
  },
  {
    id: 'dermatology',
    name: 'Dermatology',
    shortDesc: 'Advanced skin health, laser therapies, and dermatologic oncology.',
    fullDesc: 'Expert clinical and cosmetic dermatology clinic diagnosing and managing complex skin conditions using medical-grade laser technology.',
    specialistsCount: 6,
    iconName: 'Sparkles',
    leadDoctor: 'Dr. Sophia Martinez',
    keyServices: ['Melanoma Screening', 'Laser Skin Resurfacing', 'Eczema & Psoriasis Unit', 'Cosmetic Dermatology']
  }
];

export const DOCTORS: Doctor[] = [
  {
    id: 'doc-saniya',
    name: 'Dr. Saniya',
    role: 'Chief of Cardiovascular Surgery',
    departmentId: 'cardiology',
    departmentName: 'Cardiology',
    experience: '18+ Years Experience',
    bio: 'Pioneer in minimally invasive robotic mitral valve repairs. Has completed over 1,500 successful cardiac interventions.',
    rating: 4.9,
    reviewsCount: 320,
    availableDays: ['Mon', 'Tue', 'Thu', 'Fri'],
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400',
    education: 'MD, Harvard Medical School',
    specialties: ['Robotic Surgery', 'Valve Repair', 'Aortic Interventions']
  },
  {
    id: 'doc-chen',
    name: 'Dr. Michael Chen',
    role: 'Chief of Neurology',
    departmentId: 'neurology',
    departmentName: 'Neurology',
    experience: '20+ Years Experience',
    bio: 'Physician of the Month. Internationally acclaimed researcher in neuro-plasticity and degenerative brain disorders.',
    rating: 4.9,
    reviewsCount: 410,
    availableDays: ['Mon', 'Wed', 'Thu'],
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400',
    education: 'MD, Johns Hopkins University',
    specialties: ['Neuro-Plasticity', 'Stroke Recovery', 'Parkinsons Care']
  },
  {
    id: 'doc-wilson',
    name: 'Dr. Robert Wilson',
    role: 'Senior Orthopedic Surgeon',
    departmentId: 'orthopedics',
    departmentName: 'Orthopedics',
    experience: '15+ Years Experience',
    bio: 'Specialist in sports medicine and complex joint reconstruction, serving as official consultant for Olympic athletes.',
    rating: 4.8,
    reviewsCount: 290,
    availableDays: ['Tue', 'Wed', 'Fri'],
    avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400',
    education: 'MD, Stanford University',
    specialties: ['Joint Replacement', 'Sports Injuries', 'Spine Reconstruction']
  },
  {
    id: 'doc-vance',
    name: 'Dr. Emily Vance',
    role: 'Head of Pediatric Medicine',
    departmentId: 'pediatrics',
    departmentName: 'Pediatrics',
    experience: '14+ Years Experience',
    bio: 'Dedicated to compassionate pediatric healthcare and neonatal critical care management.',
    rating: 4.9,
    reviewsCount: 350,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    avatarUrl: 'https://images.unsplash.com/photo-1594824813566-88855ce78347?auto=format&fit=crop&q=80&w=400',
    education: 'MD, Columbia University',
    specialties: ['Neonatal Care', 'Pediatric Cardiology', 'Growth Development']
  },
  {
    id: 'doc-thorne',
    name: 'Dr. James Thorne',
    role: 'Director of Oncology',
    departmentId: 'oncology',
    departmentName: 'Oncology',
    experience: '22+ Years Experience',
    bio: 'Pioneered targeted immunotherapy treatments reducing side effects while improving remission rates.',
    rating: 4.9,
    reviewsCount: 180,
    availableDays: ['Mon', 'Wed', 'Fri'],
    avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400',
    education: 'MD, Oxford University',
    specialties: ['Immunotherapy', 'Surgical Oncology', 'Precision Genetics']
  },
  {
    id: 'doc-martinez',
    name: 'Dr. Sophia Martinez',
    role: 'Lead Dermatologist',
    departmentId: 'dermatology',
    departmentName: 'Dermatology',
    experience: '12+ Years Experience',
    bio: 'Specialist in early melanoma diagnostics and non-ablative laser skin therapies.',
    rating: 4.8,
    reviewsCount: 210,
    availableDays: ['Tue', 'Thu', 'Sat'],
    avatarUrl: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80&w=400',
    education: 'MD, UCLA School of Medicine',
    specialties: ['Melanoma Screening', 'Laser Surgery', 'Clinical Dermatology']
  }
];
