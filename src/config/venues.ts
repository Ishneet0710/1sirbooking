import type { Venue } from '@/types';

export const DEFAULT_VENUES: Venue[] = [
  { name: "Training Shed A", color: "#F8BBD9" },    // Light Pink
  { name: "Training Shed B", color: "#1E88E5" },    // Blue
  { name: "Training Shed C", color: "#FFC107" },    // Amber
  { name: "Training Shed SP", color: "#004D40" },   // Teal Darken-4
  { name: "Leopards Square", color: "#8E24AA" },    // Purple
  { name: "Heart Shaped Knoll", color: "#F4511E" }, // Deep Orange
  { name: "LT A", color: "#3949AB" },               // Indigo
  { name: "LT C", color: "#C0CA33" },               // Lime
  { name: "LT HQ", color: "#6D4C41" },               // Brown
  { name: "Battalion Conference Room", color: "#43A047" }, // Green
  { name: "Battlestation", color: "#607D8B" },      // Blue Grey
  { name: "Bn HQ Mess", color: "#FFEB3B" }          // Yellow
];

// Helper to get color by venue name
export const getVenueColor = (venueName: string): string => {
  const venue = DEFAULT_VENUES.find(v => v.name === venueName);
  return venue ? venue.color : '#808080'; // Default gray if not found
};
