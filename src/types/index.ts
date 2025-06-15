
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
  requestedPeriodStart: string; // ISO string from FullCalendar's DateSelectArg
  requestedPeriodEnd: string;   // ISO string from FullCalendar's DateSelectArg
  timestamp: any; // Firestore ServerTimestamp placeholder or actual Timestamp
  status: 'pending' | 'reviewed'; // Example statuses
}
