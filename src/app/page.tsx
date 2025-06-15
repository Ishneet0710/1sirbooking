
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { BookingsData, Booking, CalendarEvent, Venue, BookingAttempt } from '@/types';
import { DEFAULT_VENUES } from '@/config/venues';
import VenueFilter from '@/components/venue-flow/VenueFilter';
import BookingForm from '@/components/venue-flow/BookingForm';
import BookingInfoDialog from '@/components/venue-flow/BookingInfoDialog';
import VenueCalendarWrapper from '@/components/venue-flow/VenueCalendarWrapper';
import { transformBookingsForCalendar, hasConflict as checkHasConflict } from '@/lib/bookings-utils';
import { useToast } from '@/hooks/use-toast';
import type { DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { parseToSingaporeDate, formatToSingaporeTime } from '@/lib/datetime';
import { CalendarDays, Filter, UserCircle, Info, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { collection, onSnapshot, query, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { parseISO } from 'date-fns';


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
  const [bookingAttempts, setBookingAttempts] = useState<BookingAttempt[]>([]);


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

  useEffect(() => {
    if (isAdmin && user) {
      const attemptsQuery = query(
        collection(db, "bookingAttempts"),
        orderBy("timestamp", "desc"),
        limit(20) // Get the last 20 attempts
      );
      const unsubscribeAttempts = onSnapshot(attemptsQuery, (querySnapshot) => {
        const attempts: BookingAttempt[] = [];
        querySnapshot.forEach((doc) => {
          attempts.push({ id: doc.id, ...doc.data() } as BookingAttempt);
        });
        setBookingAttempts(attempts);
      }, (err) => {
        console.error("Error fetching booking attempts:", err);
        toast({
          title: "Error Loading Booking Attempts",
          description: err.message,
          variant: "destructive",
        });
      });
      return () => unsubscribeAttempts();
    } else {
      setBookingAttempts([]); // Clear attempts if not admin or not logged in
    }
  }, [isAdmin, user, toast]);


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

  const handleDateClick = async (arg: DateSelectArg) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please log in to interact with the calendar.", variant: "default" });
      return;
    }

    if (!isAdmin) {
      try {
        const attemptData = {
          userId: user.uid,
          userDisplayName: user.displayName,
          userEmail: user.email,
          requestedPeriodStart: arg.start.toISOString(),
          requestedPeriodEnd: arg.end.toISOString(),
          timestamp: serverTimestamp(),
          status: 'pending' as 'pending',
        };
        await addDoc(collection(db, 'bookingAttempts'), attemptData);
        toast({
          title: "Booking Interest Logged",
          description: "Your interest in this time slot has been noted for admin review. Only administrators can create bookings.",
          variant: "default"
        });
      } catch (error) {
        console.error("Error logging booking attempt:", error);
        toast({
          title: "Logging Error",
          description: "Could not log your booking interest. Please try again.",
          variant: "destructive"
        });
      }
      return;
    }

    // Admin flow:
    const startDate = parseToSingaporeDate(arg.startStr);
    let endDate = arg.endStr ? parseToSingaporeDate(arg.endStr) : new Date(startDate.getTime() + 60 * 60 * 1000);

    if (arg.allDay && arg.view.type === 'dayGridMonth') {
       endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    }
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
    setBookingFormInitialData(bookingToEdit);
    setIsBookingFormOpen(true);
    setIsBookingInfoOpen(false);
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
        <div className="lg:col-span-4 hidden lg:flex lg:flex-col space-y-6">
          <VenueFilter
            venues={DEFAULT_VENUES}
            selectedVenues={selectedVenues}
            onFilterChange={handleFilterChange}
          />
          {isAdmin && bookingAttempts.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-headline text-primary">Booking Interests</CardTitle>
                <CardDescription>Recent booking interests logged by users.</CardDescription>
              </CardHeader>
              <CardContent className="pt-2 max-h-96 overflow-y-auto">
                <ul className="space-y-3">
                  {bookingAttempts.map((attempt) => (
                    <li key={attempt.id} className="p-3 bg-muted/50 rounded-md text-sm">
                      <p className="font-semibold text-foreground">
                        {attempt.userDisplayName || attempt.userEmail || 'Unknown User'}
                      </p>
                      <div className="flex items-center text-muted-foreground mt-1">
                        <CalendarDays size={14} className="mr-1.5" />
                        Requested: {formatToSingaporeTime(parseISO(attempt.requestedPeriodStart), 'MMM d, yy')}
                      </div>
                       <div className="flex items-center text-muted-foreground">
                         <Clock size={14} className="mr-1.5" />
                         From: {formatToSingaporeTime(parseISO(attempt.requestedPeriodStart), 'p')} to {formatToSingaporeTime(parseISO(attempt.requestedPeriodEnd), 'p')}
                       </div>
                      <p className="text-xs text-muted-foreground/80 mt-1">
                        Logged: {attempt.timestamp?.toDate ? formatToSingaporeTime(attempt.timestamp.toDate(), 'PP p') : 'Processing...'}
                      </p>
                    </li>
                  ))}
                </ul>
                 {bookingAttempts.length === 0 && <p className="text-sm text-muted-foreground">No recent booking interests.</p>}
              </CardContent>
            </Card>
          )}
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
                 <Info size={48} className="mx-auto text-accent mb-2" />
                <p className="text-accent-foreground font-semibold">You are logged in as a standard user.</p>
                <p className="text-sm text-accent-foreground/80">Booking creation and management are restricted to administrators. If you'd like to book a slot, click on it and your interest will be logged for admin review.</p>
              </CardContent>
            </Card>
          )}
          <VenueCalendarWrapper
            events={calendarEvents}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            calendarKey={calendarKey}
          />
           {/* Mobile view for booking attempts (if VenueFilter sheet is not open) */}
           {isAdmin && bookingAttempts.length > 0 && !isFilterSheetOpen && (
            <div className="lg:hidden mt-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-headline text-primary">Booking Interests</CardTitle>
                  <CardDescription>Recent booking interests logged by users.</CardDescription>
                </CardHeader>
                <CardContent className="pt-2 max-h-96 overflow-y-auto">
                  <ul className="space-y-3">
                    {bookingAttempts.map((attempt) => (
                       <li key={attempt.id} className="p-3 bg-muted/50 rounded-md text-sm">
                        <p className="font-semibold text-foreground">
                          {attempt.userDisplayName || attempt.userEmail || 'Unknown User'}
                        </p>
                        <div className="flex items-center text-muted-foreground mt-1">
                          <CalendarDays size={14} className="mr-1.5" />
                           Requested: {formatToSingaporeTime(parseISO(attempt.requestedPeriodStart), 'MMM d, yy')}
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <Clock size={14} className="mr-1.5" />
                          From: {formatToSingaporeTime(parseISO(attempt.requestedPeriodStart), 'p')} to {formatToSingaporeTime(parseISO(attempt.requestedPeriodEnd), 'p')}
                        </div>
                        <p className="text-xs text-muted-foreground/80 mt-1">
                          Logged: {attempt.timestamp?.toDate ? formatToSingaporeTime(attempt.timestamp.toDate(), 'PP p') : 'Processing...'}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {bookingAttempts.length === 0 && <p className="text-sm text-muted-foreground">No recent booking interests.</p>}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <div className="lg:hidden fixed bottom-4 right-4 z-50">
         <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
          <SheetTrigger asChild>
            <Button size="lg" className="rounded-full shadow-lg">
              <Filter size={20} className="mr-2" /> Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[calc(100vh-60px)] flex flex-col"> {/* Adjusted height */}
            <SheetHeader className="shrink-0">
              <SheetTitle className="font-headline text-2xl">Filter Venues</SheetTitle>
              <SheetDescription>
                Select venues to display on the calendar.
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 flex-grow overflow-y-auto"> {/* Made this scrollable */}
            <VenueFilter
              venues={DEFAULT_VENUES}
              selectedVenues={selectedVenues}
              onFilterChange={(newSelection) => {
                handleFilterChange(newSelection);
              }}
            />
            </div>
             <Button onClick={() => setIsFilterSheetOpen(false)} className="w-full mt-auto shrink-0">Apply Filters</Button> {/* Ensure button is at bottom */}
          </SheetContent>
        </Sheet>
      </div>

      {isBookingFormOpen && isAdmin && ( // Only admin can open the actual booking form
        <BookingForm
          isOpen={isBookingFormOpen}
          onClose={() => {
            setIsBookingFormOpen(false);
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
          onEditBooking={handleStartEditBooking}
        />
      )}
    </div>
  );
}
