export type Role = "admin" | "teacher" | "student" | "parent";

export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "expired";

export interface User {
  id: string;
  username: string;
  email?: string;
  passwordHash: string;
  name: string;
  role: Role;
  phone?: string;
  whatsapp?: string;
  teacherId?: string;
  mustSetPassword?: boolean;
  createdAt: string;
}

export interface MediaItem {
  id: string;
  title: string;
  url: string;
}

export interface Teacher {
  id: string;
  name: string;
  nameAr: string;
  photoUrl: string;
  bio: string;
  bioAr: string;
  subjects: string[];
  active: boolean;
  userId?: string;
  videos: MediaItem[];
  audios: MediaItem[];
  /** Lesson price in USD for a 1-hour session */
  priceUsd: number;
}

export type PaymentMethod = "manual" | "card";

/** Weekly availability: day 0=Sun … 6=Sat, hours in Egypt time (Africa/Cairo) */
export interface AvailabilitySlot {
  id: string;
  teacherId: string;
  dayOfWeek: number;
  startHour: number;
  endHour: number;
}

export interface Booking {
  id: string;
  teacherId: string;
  slotStart: string; // ISO
  slotEnd: string;
  guestName: string;
  guestEmail: string;
  phone: string;
  whatsapp: string;
  timezone: string;
  notes?: string;
  status: BookingStatus;
  holdExpiresAt: string;
  studentId?: string;
  createdAt: string;
  confirmedAt?: string;
  amountUsd: number;
  paymentMethod?: PaymentMethod;
  paidAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  bookingId?: string;
}

export interface ParentStudentLink {
  id: string;
  parentId: string;
  studentId: string;
}

export interface ChatThread {
  id: string;
  teacherId: string;
  studentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  originalText: string;
  originalLang: "en" | "ar";
  translatedText: string;
  translatedLang: "en" | "ar";
  createdAt: string;
}

export interface AppData {
  users: User[];
  teachers: Teacher[];
  availability: AvailabilitySlot[];
  bookings: Booking[];
  notifications: Notification[];
  parentLinks: ParentStudentLink[];
}
