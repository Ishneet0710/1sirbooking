
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LoginLogoutButton from '@/components/auth/LoginLogoutButton';
import { CalendarDays, Box, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AppHeader = () => {
  const pathname = usePathname();

  return (
    <header className="w-full max-w-7xl mb-6 flex justify-between items-center flex-wrap gap-y-4">
      <div className="flex items-center gap-2 md:gap-4">
         <Building2 size={24} className="text-primary" />
         <h1 className="text-xl font-headline text-primary">Venue1SIR</h1>
      </div>
      <nav className="flex items-center gap-1 bg-muted p-1 rounded-lg order-last sm:order-none w-full sm:w-auto">
        <Link href="/" passHref className="flex-1">
          <Button variant={pathname === '/' ? 'default' : 'ghost'} size="sm" className="w-full">
             <CalendarDays className="mr-2 h-4 w-4" />
             Venues
          </Button>
        </Link>
        <Link href="/items" passHref className="flex-1">
          <Button variant={pathname === '/items' ? 'default' : 'ghost'} size="sm" className="w-full">
             <Box className="mr-2 h-4 w-4" />
             Items
          </Button>
        </Link>
      </nav>
      <div className="flex items-center gap-4">
        <LoginLogoutButton />
      </div>
    </header>
  );
};

export default AppHeader;
