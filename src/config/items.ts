import type { LoanableItemSpec } from '@/types';

export const DEFAULT_ITEMS: LoanableItemSpec[] = [
  {
    id: 'lap-recorders',
    name: 'Lap Recorders',
    category: 'Audio Equipment',
    quantity: 2,
  },
  {
    id: 'flash-guards',
    name: 'Flashguard',
    category: 'Photography',
    quantity: 1,
  },
  {
    id: 'laminators',
    name: 'Laminator',
    category: 'Office Equipment',
    quantity: 1,
  },
  {
    id: 'projector',
    name: 'Projector',
    category: 'Electronics',
    quantity: 1,
  },
  {
    id: 'ippt-chip-box',
    name: 'IPPT Chip Box (With Chips)',
    category: 'Training Equipment',
    quantity: 1,
  },
];
