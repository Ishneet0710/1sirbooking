
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
        // If a booking exists for a venue not in DEFAULT_VENUES (e.g. old data), still include it
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
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to create a booking.", variant: "default" });
      return;
    }
    const startDate = parseToSingaporeDate(arg.startStr);
    let endDate = arg.endStr ? parseToSingaporeDate(arg.endStr) : new Date(startDate.getTime() + 60 * 60 * 1000); 
    
    if (arg.allDay && arg.view.type === 'dayGridMonth') {
       endDate = new Date(startDate.getTime() + 60 * 60 * 1000); 
    }

    setBookingFormInitialData({ startDate, endDate });
    setIsBookingFormOpen(true);
  };

  const handleEventClick = (arg: EventClickArg) => {
    const booking = arg.event.extendedProps.originalBooking as Booking;
    if (booking) {
      setSelectedBookingInfo(booking);
      setIsBookingInfoOpen(true);
    }
  };

  const handleSubmitBooking = async (booking: Booking): Promise<boolean> => {
    if (!user) {
      toast({ title: "Not Authorized", description: "You must be logged in to save a booking.", variant: "destructive" });
      return false;
    }

    if (bookingsData && bookingsData[booking.venue]) {
      if (checkHasConflict(booking, bookingsData[booking.venue])) {
         toast({
          title: 'Booking Conflict',
          description: 'This time slot is already booked for the selected venue.',
          variant: 'destructive',
        });
        return false; 
      }
    }

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      toast({ title: "Not Authorized", description: "You must be logged in to delete bookings.", variant: "destructive" });
      return;
    }
    
    // Client-side check for isAdmin for UX (actual enforcement is by Firestore rules)
    // if (!isAdmin) {
    //   toast({ title: "Not Authorized", description: "You do not have permission to delete bookings.", variant: "destructive" });
    //   return;
    // }
    console.log("Attempting delete as user:", user?.uid, "IsAdmin (client-side):", isAdmin); // DEBUG LOG

    try {
      const response = await fetch('/api/bookings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
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
      console.error("handleDeleteBooking catch error:", err); // Log the actual error object
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
        <h1 className="text-4xl font-headline text-primary">VenueFlow</h1>
        <p className="text-lg text-muted-foreground">Loading bookings...</p>
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-7xl mb-8 flex justify-between items-center">
        <div className="flex items-center">
          <CalendarDays size={40} className="mr-3 text-accent hidden sm:block" />
          <div>
            <h1 className="text-3xl md:text-5xl font-headline text-primary">
              VenueFlow
            </h1>
            <p className="text-md md:text-lg text-muted-foreground mt-1">
              Seamlessly manage and book your venue spaces.
            </p>
          </div>
        </div>
        <LoginLogoutButton />
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 hidden lg:block">
          <VenueFilter
            venues={DEFAULT_VENUES} 
            selectedVenues={selectedVenues}
            onFilterChange={handleFilterChange}
          />
        </div>

        <div className="lg:col-span-9">
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
                <p className="text-primary-foreground font-semibold">Please log in to create bookings and view full details.</p>
                <p className="text-sm text-primary-foreground/80">Public bookings are currently visible.</p>
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

      {isBookingFormOpen && user && ( 
        <BookingForm
          isOpen={isBookingFormOpen}
          onClose={() => setIsBookingFormOpen(false)}
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
        />
      )}
    </div>
  );
}
