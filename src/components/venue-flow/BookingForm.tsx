
"use client";

import type React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Booking, Venue } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Label component is not directly used, FormLabel is used from Form context
// import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
// Textarea is not currently used in this form
// import { Textarea } from '@/components/ui/textarea';
import { getCurrentSingaporeDate, formatDateForInput, formatTimeForInput, combineDateTimeToSingaporeDate, formatToSingaporeISOString, parseToSingaporeDate } from '@/lib/datetime';
import { generateBookingId } from '@/lib/bookings-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const bookingFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  venue: z.string().min(1, 'Venue is required'),
  startDate: z.string().min(1, "Start date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endDate: z.string().min(1, "End date is required"),
  endTime: z.string().min(1, "End time is required"),
}).refine(data => {
  const startDateTime = combineDateTimeToSingaporeDate(data.startDate, data.startTime);
  const endDateTime = combineDateTimeToSingaporeDate(data.endDate, data.endTime);
  return endDateTime > startDateTime;
}, {
  message: "End date and time must be after start date and time",
  path: ["endDate"], 
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface BookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitBooking: (booking: Booking) => Promise<boolean>; 
  venues: Venue[];
  initialData?: Partial<Booking & { startDate?: Date, endDate?: Date }>; 
  existingBookingsForVenue?: Booking[];
  submitButtonText: string; // New prop for dynamic button text
}

const BookingForm: React.FC<BookingFormProps> = ({ 
  isOpen, 
  onClose, 
  onSubmitBooking, 
  venues, 
  initialData, 
  submitButtonText 
}) => {
  
  const defaultStartDate = initialData?.startDate || getCurrentSingaporeDate();
  let defaultEndDate = initialData?.endDate || new Date(defaultStartDate.getTime() + 60 * 60 * 1000); // 1 hour later

  // Ensure defaultEndDate is after defaultStartDate
  if (defaultEndDate <= defaultStartDate) {
    defaultEndDate = new Date(defaultStartDate.getTime() + 60 * 60 * 1000);
  }


  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      venue: initialData?.venue || (venues.length > 0 ? venues[0].name : ''),
      startDate: formatDateForInput(initialData?.start ? parseToSingaporeDate(initialData.start) : defaultStartDate),
      startTime: formatTimeForInput(initialData?.start ? parseToSingaporeDate(initialData.start) : defaultStartDate),
      endDate: formatDateForInput(initialData?.end ? parseToSingaporeDate(initialData.end) : defaultEndDate),
      endTime: formatTimeForInput(initialData?.end ? parseToSingaporeDate(initialData.end) : defaultEndDate),
    },
  });

  useEffect(() => {
    // Determine start and end dates for resetting the form
    const effectiveInitialStartDate = initialData?.startDate || getCurrentSingaporeDate();
    let effectiveInitialEndDate = initialData?.endDate;
    
    // If endDate is not provided or is before startDate, set it to 1 hour after startDate
    if (!effectiveInitialEndDate || effectiveInitialEndDate <= effectiveInitialStartDate) {
      effectiveInitialEndDate = new Date(effectiveInitialStartDate.getTime() + 60 * 60 * 1000);
    }

    form.reset({
      title: initialData?.title || '',
      venue: initialData?.venue || (venues.length > 0 ? venues[0].name : ''),
      startDate: formatDateForInput(initialData?.start ? parseToSingaporeDate(initialData.start) : effectiveInitialStartDate),
      startTime: formatTimeForInput(initialData?.start ? parseToSingaporeDate(initialData.start) : effectiveInitialStartDate),
      endDate: formatDateForInput(initialData?.end ? parseToSingaporeDate(initialData.end) : effectiveInitialEndDate),
      endTime: formatTimeForInput(initialData?.end ? parseToSingaporeDate(initialData.end) : effectiveInitialEndDate),
    });
  }, [initialData, form, venues]);


  const handleSubmit = async (values: BookingFormValues) => {
    const startDateTime = combineDateTimeToSingaporeDate(values.startDate, values.startTime);
    const endDateTime = combineDateTimeToSingaporeDate(values.endDate, values.endTime);

    const booking: Booking = {
      id: initialData?.id || generateBookingId(), // Use existing ID if editing, else generate new
      title: values.title,
      venue: values.venue,
      start: formatToSingaporeISOString(startDateTime),
      end: formatToSingaporeISOString(endDateTime),
    };
    
    const success = await onSubmitBooking(booking);
    if (success) {
      form.reset(); // Reset form on successful submission
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">
            {initialData?.id ? 'Edit Booking' : (submitButtonText === 'Submit Request' ? 'Request Booking Slot' : 'Create New Booking')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title / Purpose</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Team Meeting, Training Session" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a venue" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {venues.map(v => (
                        <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(parseToSingaporeDate(field.value + "T00:00:00"), "PPP") // Parse as date part only for display
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? parseToSingaporeDate(field.value + "T00:00:00") : undefined}
                          onSelect={(date) => field.onChange(date ? formatDateForInput(date) : '')}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                               format(parseToSingaporeDate(field.value + "T00:00:00"), "PPP") // Parse as date part only for display
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? parseToSingaporeDate(field.value + "T00:00:00") : undefined}
                           onSelect={(date) => field.onChange(date ? formatDateForInput(date) : '')}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Processing...' : submitButtonText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BookingForm;
