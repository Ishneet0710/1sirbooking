
import type { Venue } from '@/types';

export const DEFAULT_VENUES: Venue[] = [
  { name: "Conference Room Alpha", color: "#FF6F00" }, // Amber Darken-4
  { name: "Innovation Hub", color: "#00ACC1" },    // Cyan Darken-1
  { name: "Synergy Space", color: "#5E35B1" },      // Deep Purple Darken-1
  { name: "Focus Booth Zen", color: "#43A047" },       // Green Darken-1
];

// Helper to get color by venue name
export const getVenueColor = (venueName: string): string => {
  const venue = DEFAULT_VENUES.find(v => v.name === venueName);
  return venue ? venue.color : '#808080'; // Default gray if not found
};
