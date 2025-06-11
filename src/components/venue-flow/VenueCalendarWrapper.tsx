
"use client";

import type React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { DateSelectArg, EventClickArg, EventInput, DatesSetArg } from '@fullcalendar/core';
import type { CalendarEvent } from '@/types'; // Use our CalendarEvent for props
import { TIMEZONE } from '@/lib/datetime';

interface VenueCalendarWrapperProps {
  events: CalendarEvent[];
  onDateClick: (arg: DateSelectArg) => void;
  onEventClick: (arg: EventClickArg) => void;
  calendarKey: string; // For forcing re-render
  onDatesSet?: (dateInfo: DatesSetArg) => void; // New prop
}

const VenueCalendarWrapper: React.FC<VenueCalendarWrapperProps> = ({ events, onDateClick, onEventClick, calendarKey, onDatesSet }) => {
  return (
    <div className="p-4 bg-card rounded-lg shadow-lg min-h-[700px] fc"> {/* Added fc class */}
      <FullCalendar
        key={calendarKey} // Force re-render when key changes
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        }}
        events={events as EventInput[]} // Cast to FullCalendar's EventInput[]
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true} // Or a number like 2
        weekends={true}
        select={onDateClick}
        eventClick={onEventClick}
        datesSet={onDatesSet} // Pass the new prop here
        editable={false} // For now, no drag-and-drop editing
        droppable={false}
        timeZone={TIMEZONE}
        height="auto" // Adjusts height to content or container
        contentHeight="auto"
        aspectRatio={1.8} // Adjust as needed for better proportions
        buttonText={{
          today:    'Today',
          month:    'Month',
          week:     'Week',
          day:      'Day',
          list:     'List'
        }}
        eventDisplay="block" // Makes events look more solid
        eventTimeFormat={{ // Consistent time formatting
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false,
          hour12: false
        }}
        displayEventEnd={true} // Show event end times
        longPressDelay={250} // For mobile interactions
        eventShortHeight={20}
        slotMinTime="07:00:00" // Business hours start
        slotMaxTime="22:00:00" // Business hours end
        scrollTime="09:00:00" // Initial scroll to 9 AM in timeGrid views
        
        // Custom styling via class names if needed, but prefer CSS vars or direct event props
        // eventClassNames={(arg) => {
        //   // Example: return ['my-custom-event-class', `event-venue-${arg.event.extendedProps.venue.replace(/\s+/g, '-').toLowerCase()}`];
        //   return [];
        // }}
      />
    </div>
  );
};

export default VenueCalendarWrapper;
