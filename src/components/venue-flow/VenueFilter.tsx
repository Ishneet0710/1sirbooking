
"use client";

import type React from 'react';
import type { Venue } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VenueFilterProps {
  venues: Venue[];
  selectedVenues: string[];
  onFilterChange: (selected: string[]) => void;
}

const VenueFilter: React.FC<VenueFilterProps> = ({ venues, selectedVenues, onFilterChange }) => {
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
  const areSomeSelected = selectedVenues.length > 0 && !areAllSelected;

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-headline">Filter Venues</CardTitle>
      </CardHeader>
      <CardContent>
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
        <ScrollArea className="h-40"> {/* Adjust height as needed */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {venues.map(venue => (
              <div key={venue.name} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted transition-colors">
                <Checkbox
                  id={`venue-${venue.name.replace(/\s+/g, '-')}`}
                  checked={selectedVenues.includes(venue.name)}
                  onCheckedChange={() => handleVenueToggle(venue.name)}
                  style={{ borderColor: venue.color }}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                 <Label
                  htmlFor={`venue-${venue.name.replace(/\s+/g, '-')}`}
                  className="text-sm flex-grow cursor-pointer"
                >
                  {venue.name}
                </Label>
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: venue.color }} aria-hidden="true"></span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default VenueFilter;
