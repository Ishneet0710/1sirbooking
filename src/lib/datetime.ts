
import { formatInTimeZone, toDate, zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { format as formatDateFns, parseISO } from 'date-fns';

export const TIMEZONE = 'Asia/Singapore';

export const formatToSingaporeTime = (date: Date | string, formatStr: string = 'yyyy-MM-dd HH:mm'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, TIMEZONE, formatStr);
};

export const convertToSingaporeTime = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return utcToZonedTime(dateObj, TIMEZONE);
};

export const convertToUTC = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return zonedTimeToUtc(dateObj, TIMEZONE);
};

// Get current date and time in Singapore timezone as a Date object
export const getCurrentSingaporeDate = (): Date => {
  return toDate(new Date(), { timeZone: TIMEZONE });
};

// Format date for input fields (date and time)
export const formatDateForInput = (date: Date): string => {
  return formatDateFns(date, "yyyy-MM-dd");
};

export const formatTimeForInput = (date: Date): string => {
  return formatDateFns(date, "HH:mm");
};

// Combine date string (YYYY-MM-DD) and time string (HH:mm) into a Date object in SG timezone
export const combineDateTimeToSingaporeDate = (dateStr: string, timeStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Create a naive Date object first, then specify it's in Singapore time
  // Note: Date constructor month is 0-indexed
  const naiveDate = new Date(year, month - 1, day, hours, minutes);
  
  // To correctly interpret this as a Singapore time date, we format it as an ISO string
  // that implies Singapore time, then parse it with date-fns-tz or ensure it's handled
  // as SG time when converting to UTC for storage.
  // A simpler way: create UTC date then convert to SG time, or construct directly with TZ info
  // This approach creates a string that formatInTimeZone can parse correctly for the target TZ
  const isoStringWithCorrectOffset = `${dateStr}T${timeStr}:00`; // This is local time
  return toDate(isoStringWithCorrectOffset, { timeZone: TIMEZONE });
};


// Format a date object (assumed to be in SG time) to an ISO string with SG offset
export const formatToSingaporeISOString = (date: Date): string => {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
};

// Parses an ISO string (potentially with 'Z' or offset) and ensures it's a Date object representing Singapore time
export const parseToSingaporeDate = (isoString: string): Date => {
  return utcToZonedTime(parseISO(isoString), TIMEZONE);
};
