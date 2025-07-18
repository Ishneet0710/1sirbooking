
import type { Timestamp } from 'firebase/firestore';

export interface Venue {
  name: string;
  color: string;
}

export interface Booking {
  id: string;
  title: string;
  start: string; // ISO 8601 string format
  end: string;   // ISO 8601 string format
  venue: string; // Name of the venue
  bookedByUserId?: string;
  bookedByUserDisplayName?: string | null;
  bookedByUserEmail?: string | null;
  // extendedProps can be used by FullCalendar if needed
  extendedProps?: {
    venue: string;
    [key: string]: any;
  };
}

// Structure for bookings data stored in bookings.json
export type BookingsData = Record<string, Booking[]>;

// Structure for FullCalendar events
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    venue: string;
    originalBooking: Booking; // Ensure this is part of the type
    [key: string]: any;
  };
}

export interface BookingAttempt {
  id: string; // Firestore document ID
  userId: string;
  userDisplayName?: string | null;
  userEmail?: string | null;
  
  // Details from the form for the request
  requestedTitle: string;
  requestedVenue: string;
  requestedStart: string; // ISO string for start datetime
  requestedEnd: string;   // ISO string for end datetime
  
  timestamp: Timestamp; // Firestore ServerTimestamp placeholder or actual Timestamp
  status: 'pending_approval' | 'approved' | 'rejected'; // Refined statuses
  createdBookingId?: string; // ID of the actual booking if approved and created
  rejectionReason?: string; // Reason for rejection, optional
}

// New Types for Item Loaning Feature

export interface LoanableItemSpec {
  id: string;
  name: string;
  category: string;
  quantity: number;
}

export interface Item {
  id: string; // Firestore document ID, e.g. 'lap-recorder'
  name: string;
  category: string;
  totalQuantity: number;
  availableQuantity: number;
}

export interface Loan {
  id: string; // Firestore document ID
  itemId: string;
  itemName: string; // Denormalized for easier display
  quantityLoaned: number;
  userId: string;
  userDisplayName: string | null;
  userEmail: string | null;
  userCompany?: string;
  loanDate: Timestamp;
  expectedReturnDate: Timestamp;
  returnDate?: Timestamp | null;
}

// Used for client-side data merging
export interface ItemWithLoanDetails extends Item {
  activeLoans: Loan[];
}
