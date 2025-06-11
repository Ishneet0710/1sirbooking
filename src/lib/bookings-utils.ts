
import type { Booking, CalendarEvent, BookingsData } from '@/types';
import { DEFAULT_VENUES, getVenueColor } from '@/config/venues';
import { parseISO, max, min } from 'date-fns';

export const overlaps = (start1: Date, end1: Date, start2: Date, end2: Date): boolean => {
  return max([start1, start2]) < min([end1, end2]);
};

export const hasConflict = (newBooking: Booking, existingBookings: Booking[]): boolean => {
  const newStart = parseISO(newBooking.start);
  const newEnd = parseISO(newBooking.end);

  return existingBookings.some(existing => {
    if (existing.id === newBooking.id) return false; // Don't conflict with itself if editing
    if (existing.venue !== newBooking.venue) return false; // Conflicts only within the same venue

    const existingStart = parseISO(existing.start);
    const existingEnd = parseISO(existing.end);
    return overlaps(newStart, newEnd, existingStart, existingEnd);
  });
};

export const transformBookingsForCalendar = (
  bookingsData: BookingsData | null,
  selectedVenues: string[]
): CalendarEvent[] => {
  if (!bookingsData) return [];

  const events: CalendarEvent[] = [];
  // Iterate directly over selectedVenues. If selectedVenues is empty, no events will be added.
  const venuesToDisplay = selectedVenues;

  for (const venueName of venuesToDisplay) {
    const venueBookings = bookingsData[venueName] || [];
    const venueColor = getVenueColor(venueName);
    for (const booking of venueBookings) {
      events.push({
        id: booking.id,
        title: booking.title,
        start: booking.start,
        end: booking.end,
        backgroundColor: venueColor,
        borderColor: venueColor,
        textColor: '#FFFFFF', // Assuming dark venue colors, white text is good. Adjust if needed.
        extendedProps: {
          venue: venueName,
          originalBooking: booking, // Store original for editing/display
        },
      });
    }
  }
  return events;
};

export const generateBookingId = (): string => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

