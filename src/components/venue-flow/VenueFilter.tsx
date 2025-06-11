
"use client";

import type React from 'react';
import type { Venue } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface VenueFilterProps {
  venues: Venue[];
  selectedVenues: string[];
  onFilterChange: (selected: string[]) => void;
  className?: string;
}

const VenueFilter: React.FC<VenueFilterProps> = ({ venues, selectedVenues, onFilterChange, className }) => {
  const handleVenueToggle = (venueName: string) => {
    const currentIndex = selectedVenues.indexOf(venueName);
    const newSelectedVenues = [...selectedVenues];

    if (currentIndex === -1) {
      newSelectedVenues.push(venueName);
    } else {
      newSelectedVenues.splice(currentIndex, 1);
    }
    onFilterChange(newSelectedVenues);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onFilterChange(venues.map(v => v.name));
    } else {
      onFilterChange([]);
    }
  };

  const areAllSelected = venues.length > 0 && selectedVenues.length === venues.length;
  // const areSomeSelected = selectedVenues.length > 0 && !areAllSelected; // Not currently used

  return (
    <Card className={cn("w-full shadow-lg flex flex-col", className)}>
      <CardHeader>
        <CardTitle className="text-xl font-headline">Filter Venues</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow pt-6"> {/* Added pt-6 to CardContent from CardHeader default */}
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="select-all-venues"
            checked={areAllSelected}
            onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
            aria-label="Select or deselect all venues"
          />
          <Label htmlFor="select-all-venues" className="text-sm font-medium">
            Select/Deselect All
          </Label>
        </div>
        <ScrollArea className="flex-grow">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3"> {/* Adjusted gap */}
            {venues.map(venue => (
              <div key={venue.name} className="flex items-center space-x-2 p-1 rounded-md hover:bg-muted transition-colors">
                <Checkbox
                  id={`venue-${venue.name.replace(/\s+/g, '-')}`}
                  checked={selectedVenues.includes(venue.name)}
                  onCheckedChange={() => handleVenueToggle(venue.name)}
                  style={{ borderColor: venue.color }} // Keep dynamic border color for checkbox
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0" // Added shrink-0
                />
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0" // Adjusted size to w-2.5 h-2.5, added shrink-0
                  style={{ backgroundColor: venue.color }} 
                  aria-hidden="true">
                </span>
                <Label
                  htmlFor={`venue-${venue.name.replace(/\s+/g, '-')}`}
                  className="text-sm flex-1 min-w-0 cursor-pointer" // Use flex-1 and min-w-0
                >
                  {venue.name}
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default VenueFilter;
