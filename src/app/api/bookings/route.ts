
import { type NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { Booking, BookingsData } from '@/types';
import { DEFAULT_VENUES } from '@/config/venues';
import { hasConflict as checkConflictUtil } from '@/lib/bookings-utils'; // Renamed to avoid clash

const DATA_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'bookings.json');

async function loadBookings(): Promise<BookingsData> {
  try {
    const fileData = await fs.readFile(DATA_FILE_PATH, 'utf-8');
    let bookings = JSON.parse(fileData) as BookingsData;
    
    // Ensure all default venues exist in the bookings data
    DEFAULT_VENUES.forEach(venue => {
      if (!bookings[venue.name]) {
        bookings[venue.name] = [];
      }
    });
    return bookings;

  } catch (error: any) {
    if (error.code === 'ENOENT') { // File not found
      // Initialize with default venues and empty bookings
      const initialBookings: BookingsData = {};
      DEFAULT_VENUES.forEach(venue => {
        initialBookings[venue.name] = [];
      });
      await saveBookings(initialBookings); // Create the file
      return initialBookings;
    }
    console.error('Failed to load bookings:', error);
    // Return default structure on other errors to prevent app crash
    const fallbackBookings: BookingsData = {};
    DEFAULT_VENUES.forEach(venue => {
      fallbackBookings[venue.name] = [];
    });
    return fallbackBookings;
  }
}

async function saveBookings(data: BookingsData): Promise<void> {
  try {
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save bookings:', error);
    throw new Error('Failed to save bookings data.');
  }
}

export async function GET() {
  try {
    const bookings = await loadBookings();
    return NextResponse.json(bookings);
  } catch (error) {
    console.error("GET /api/bookings error:", error);
    return NextResponse.json({ message: 'Error loading bookings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const newBooking: Booking = await request.json();
    const currentBookingsData = await loadBookings();

    if (!newBooking.venue || !currentBookingsData[newBooking.venue]) {
      return NextResponse.json({ message: 'Invalid venue specified.' }, { status: 400 });
    }
    
    // Flatten all bookings for conflict checking utility compatibility, then filter by newBooking's venue
    const allBookingsForVenue = currentBookingsData[newBooking.venue] || [];

    if (checkConflictUtil(newBooking, allBookingsForVenue)) {
      return NextResponse.json({ message: 'Booking conflict detected.' }, { status: 409 }); // 409 Conflict
    }

    // Add or update the booking
    const venueBookings = currentBookingsData[newBooking.venue];
    const existingBookingIndex = venueBookings.findIndex(b => b.id === newBooking.id);

    if (existingBookingIndex > -1) {
      venueBookings[existingBookingIndex] = newBooking; // Update existing
    } else {
      venueBookings.push(newBooking); // Add new
    }
    
    currentBookingsData[newBooking.venue] = venueBookings;

    await saveBookings(currentBookingsData);
    return NextResponse.json(newBooking, { status: 201 });

  } catch (error) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json({ message: 'Error processing booking' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { bookingId, venueName } = await request.json();

    if (!bookingId || !venueName) {
      return NextResponse.json({ message: 'Booking ID and Venue Name are required.' }, { status: 400 });
    }

    const currentBookingsData = await loadBookings();

    if (!currentBookingsData[venueName]) {
      return NextResponse.json({ message: 'Venue not found.' }, { status: 404 });
    }

    const venueBookings = currentBookingsData[venueName];
    const bookingIndex = venueBookings.findIndex(b => b.id === bookingId);

    if (bookingIndex === -1) {
      return NextResponse.json({ message: 'Booking not found.' }, { status: 404 });
    }

    venueBookings.splice(bookingIndex, 1);
    currentBookingsData[venueName] = venueBookings;

    await saveBookings(currentBookingsData);
    return NextResponse.json({ message: 'Booking deleted successfully.' }, { status: 200 });

  } catch (error) {
    console.error("DELETE /api/bookings error:", error);
    return NextResponse.json({ message: 'Error deleting booking' }, { status: 500 });
  }
}
