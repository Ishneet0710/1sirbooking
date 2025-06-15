
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { BookingsData, Booking, CalendarEvent, Venue } from '@/types';
import { DEFAULT_VENUES } from '@/config/venues';
import VenueFilter from '@/components/venue-flow/VenueFilter';
import BookingForm from '@/components/venue-flow/BookingForm';
import BookingInfoDialog from '@/components/venue-flow/BookingInfoDialog';
import VenueCalendarWrapper from '@/components/venue-flow/VenueCalendarWrapper';
import { transformBookingsForCalendar, hasConflict as checkHasConflict } from '@/lib/bookings-utils';
import { useToast } from '@/hooks/use-toast';
import type { DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { parseToSingaporeDate } from '@/lib/datetime';
import { CalendarDays, Filter, UserCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import LoginLogoutButton from '@/components/auth/LoginLogoutButton';
import { useAuth } from '@/context/AuthContext';


import { db } from '@/lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

export default function VenueFlowPage() {
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [selectedVenues, setSelectedVenues] = useState<string[]>(DEFAULT_VENUES.map(v => v.name));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [bookingFormInitialData, setBookingFormInitialData] = useState<Partial<Booking & { startDate?: Date, endDate?: Date }>>({});

  const [isBookingInfoOpen, setIsBookingInfoOpen] = useState(false);
  const [selectedBookingInfo, setSelectedBookingInfo] = useState<Booking | null>(null);

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);


  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, "bookings"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const bookingsFromFirestore: Booking[] = [];
      querySnapshot.forEach((doc) => {
        bookingsFromFirestore.push({ id: doc.id, ...doc.data() } as Booking);
      });
      setAllBookings(bookingsFromFirestore);
      setIsLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching bookings from Firestore:", err);
      setError(err.message);
      toast({
        title: 'Error Loading Bookings',
        description: err.message || 'Could not load booking data from Firestore.',
        variant: 'destructive',
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);


  const bookingsData: BookingsData | null = useMemo(() => {
    if (isLoading || !allBookings) return null;

    const groupedBookings: BookingsData = {};
    DEFAULT_VENUES.forEach(venue => {
      groupedBookings[venue.name] = [];
    });

    allBookings.forEach(booking => {
      if (groupedBookings[booking.venue]) {
        groupedBookings[booking.venue].push(booking);
      } else {
        if (!groupedBookings[booking.venue]) {
           groupedBookings[booking.venue] = [];
        }
        groupedBookings[booking.venue].push(booking);
      }
    });
    return groupedBookings;
  }, [allBookings, isLoading]);


  const handleFilterChange = (newSelectedVenues: string[]) => {
    setSelectedVenues(newSelectedVenues);
  };

  const handleDateClick = (arg: DateSelectArg) => {
    if (!isAdmin) {
      toast({ title: "Admin Action Required", description: "Only administrators can create bookings.", variant: "default" });
      return;
    }
    const startDate = parseToSingaporeDate(arg.startStr);
    let endDate = arg.endStr ? parseToSingaporeDate(arg.endStr) : new Date(startDate.getTime() + 60 * 60 * 1000);

    if (arg.allDay && arg.view.type === 'dayGridMonth') {
       endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    }
    // Clear any existing ID from previous edits
    setBookingFormInitialData({ startDate, endDate, id: undefined, title: undefined, venue: undefined });
    setIsBookingFormOpen(true);
  };

  const handleEventClick = (arg: EventClickArg) => {
    const booking = arg.event.extendedProps.originalBooking as Booking;
    if (booking) {
      setSelectedBookingInfo(booking);
      setIsBookingInfoOpen(true);
    }
  };

  const handleStartEditBooking = (bookingToEdit: Booking) => {
    if (!isAdmin) {
      toast({ title: "Admin Action Required", description: "Only administrators can edit bookings.", variant: "default" });
      return;
    }
    // The BookingForm component expects `start` and `end` as ISO strings if they exist in initialData,
    // and it will parse them. For new bookings via date click, we set startDate/endDate as Date objects.
    // Here, we directly pass the booking object.
    setBookingFormInitialData(bookingToEdit);
    setIsBookingFormOpen(true);
    setIsBookingInfoOpen(false); // Close the info dialog
  };

  const handleSubmitBooking = async (booking: Booking): Promise<boolean> => {
    if (!user) {
      toast({ title: "Not Logged In", description: "You must be logged in to save a booking.", variant: "destructive" });
      return false;
    }
    if (!isAdmin) {
      toast({ title: "Not Authorized", description: "Only administrators can save bookings.", variant: "destructive" });
      return false;
    }
    console.log("Attempting save as admin user:", user?.uid);

    // Conflict check needs to exclude the booking being edited
    if (bookingsData && bookingsData[booking.venue]) {
      const otherBookingsInVenue = bookingsData[booking.venue].filter(b => b.id !== booking.id);
      if (checkHasConflict(booking, otherBookingsInVenue)) {
         toast({
          title: 'Booking Conflict',
          description: 'This time slot is already booked for the selected venue, or overlaps with another booking.',
          variant: 'destructive',
        });
        return false;
      }
    }

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(booking),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
           toast({ title: 'Not Authorized', description: errorData.message || 'You do not have permission to save this booking.', variant: 'destructive' });
        } else {
          throw new Error(errorData.message || `Failed to save booking: ${response.statusText}`);
        }
        return false;
      }

      toast({
        title: 'Booking Saved!',
        description: `${booking.title} for ${booking.venue} has been successfully ${bookingFormInitialData.id ? 'updated' : 'created'}.`,
      });
      // Reset bookingFormInitialData if it was an edit, so next new booking doesn't carry over the ID
      if (bookingFormInitialData.id) {
        setBookingFormInitialData({});
      }
      return true;
    } catch (err: any) {
      toast({
        title: 'Error Saving Booking',
        description: err.message || 'Could not save the booking.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleDeleteBooking = async (bookingId: string, venueName: string) => {
     if (!user) {
      toast({ title: "Not Logged In", description: "You must be logged in to delete bookings.", variant: "destructive" });
      return;
    }
    if (!isAdmin) {
      toast({ title: "Not Authorized", description: "Only administrators can delete bookings.", variant: "destructive" });
      return;
    }
    console.log("Attempting delete as admin user:", user?.uid);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/bookings', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ bookingId, venueName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
         if (response.status === 403) {
           toast({ title: 'Not Authorized', description: errorData.message || 'You do not have permission to delete this booking.', variant: 'destructive' });
        } else {
          toast({ title: 'Error Deleting Booking', description: errorData.message || `Failed to delete booking: ${response.statusText}`, variant: 'destructive' });
        }
        return;
      }

      toast({
        title: 'Booking Deleted',
        description: 'The booking has been successfully deleted.',
      });
    } catch (err: any) {
      console.error("handleDeleteBooking catch error:", err);
      toast({
        title: 'Error Deleting Booking',
        description: err.message || 'Could not delete the booking.',
        variant: 'destructive',
      });
    }
  };

  const calendarEvents = transformBookingsForCalendar(bookingsData, selectedVenues);
  const calendarKey = `${selectedVenues.join('-')}_${calendarEvents.length}_${allBookings.length}`;


  if (isLoading && allBookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 space-y-8 bg-background">
        <h1 className="text-4xl font-headline text-primary">Venue1SIR</h1>
        <p className="text-lg text-muted-foreground">Loading bookings...</p>
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-7xl mb-8 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <CalendarDays size={20} className="text-accent" />
          <h1 className="text-lg font-headline text-primary">
            Venue1SIR
          </h1>
        </div>
        <LoginLogoutButton />
      </header>

      <main className="w-full max-w-7xl lg:grid lg:grid-cols-12 lg:gap-6 lg:items-stretch">
        <div className="lg:col-span-4 hidden lg:flex lg:flex-col">
          <VenueFilter
            venues={DEFAULT_VENUES}
            selectedVenues={selectedVenues}
            onFilterChange={handleFilterChange}
            className="flex-grow"
          />
        </div>

        <div className="lg:col-span-8">
          {error && (
            <Card className="mb-4 border-destructive bg-destructive/10">
              <CardContent className="p-4">
                <p className="text-destructive-foreground text-sm">{error}</p>
              </CardContent>
            </Card>
          )}
          {!user && !isLoading && (
            <Card className="mb-4 border-primary bg-primary/10">
              <CardContent className="p-6 text-center">
                <UserCircle size={48} className="mx-auto text-primary mb-2" />
                <p className="text-primary-foreground font-semibold">Please log in to view bookings.</p>
                <p className="text-sm text-primary-foreground/80">If you are an admin, logging in will allow you to manage bookings.</p>
              </CardContent>
            </Card>
          )}
          {user && !isAdmin && !isLoading && (
             <Card className="mb-4 border-accent bg-accent/10">
              <CardContent className="p-6 text-center">
                <UserCircle size={48} className="mx-auto text-accent mb-2" />
                <p className="text-accent-foreground font-semibold">You are logged in as a standard user.</p>
                <p className="text-sm text-accent-foreground/80">Booking creation and management are restricted to administrators.</p>
              </CardContent>
            </Card>
          )}
          <VenueCalendarWrapper
            events={calendarEvents}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            calendarKey={calendarKey}
          />
        </div>
      </main>

      <div className="lg:hidden fixed bottom-4 right-4 z-50">
         <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
          <SheetTrigger asChild>
            <Button size="lg" className="rounded-full shadow-lg">
              <Filter size={20} className="mr-2" /> Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[75vh]">
            <SheetHeader>
              <SheetTitle className="font-headline text-2xl">Filter Venues</SheetTitle>
              <SheetDescription>
                Select venues to display on the calendar.
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
            <VenueFilter
              venues={DEFAULT_VENUES}
              selectedVenues={selectedVenues}
              onFilterChange={(newSelection) => {
                handleFilterChange(newSelection);
              }}
            />
            </div>
             <Button onClick={() => setIsFilterSheetOpen(false)} className="w-full mt-4">Apply Filters</Button>
          </SheetContent>
        </Sheet>
      </div>

      {isBookingFormOpen && isAdmin && (
        <BookingForm
          isOpen={isBookingFormOpen}
          onClose={() => {
            setIsBookingFormOpen(false);
            // Clear initial data when form is closed, especially after an edit
            setBookingFormInitialData({}); 
          }}
          onSubmitBooking={handleSubmitBooking}
          venues={DEFAULT_VENUES}
          initialData={bookingFormInitialData}
          existingBookingsForVenue={
            bookingFormInitialData.venue && bookingsData ? bookingsData[bookingFormInitialData.venue] : []
          }
        />
      )}

      {isBookingInfoOpen && selectedBookingInfo && (
        <BookingInfoDialog
          isOpen={isBookingInfoOpen}
          onClose={() => setIsBookingInfoOpen(false)}
          booking={selectedBookingInfo}
          onDeleteBooking={handleDeleteBooking}
          onEditBooking={handleStartEditBooking} // Pass the new handler
        />
      )}
    </div>
  );
}
