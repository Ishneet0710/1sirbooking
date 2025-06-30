import type { LoanableItemSpec } from '@/types';

export const DEFAULT_ITEMS: LoanableItemSpec[] = [
  {
    id: 'lap-recorders',
    name: 'Lap Recorders',
    category: 'Audio Equipment',
    description: 'High-quality digital voice recorders, perfect for interviews and lectures.',
    quantity: 2,
  },
  {
    id: 'flash-guards',
    name: 'Flash Guards',
    category: 'Photography',
    description: 'Diffusers for on-camera flash to soften light and reduce harsh shadows.',
    quantity: 1,
  },
  {
    id: 'laminators',
    name: 'Laminators',
    category: 'Office Equipment',
    description: 'A4 size laminating machines for preserving documents.',
    quantity: 1,
  },
  {
    id: 'projector',
    name: 'Projector',
    category: 'Electronics',
    description: 'Portable HD projector with HDMI and USB inputs. Includes remote and power cable.',
    quantity: 1,
  },
  {
    id: 'ippt-chip-box',
    name: 'IPPT Chip Box (With Chips)',
    category: 'Training Equipment',
    description: 'A full box of electronic timing chips for IPPT.',
    quantity: 1,
  },
];
