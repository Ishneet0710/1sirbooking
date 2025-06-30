
import type { LoanableItemSpec } from '@/types';

export const DEFAULT_ITEMS: LoanableItemSpec[] = [
  {
    id: 'lap-recorder',
    name: 'Lap Recorder',
    category: 'Audio Equipment',
    description: 'High-quality digital voice recorder, perfect for interviews and lectures. Comes with a lavalier microphone.',
    imageUrl: 'https://placehold.co/600x400.png',
    quantity: 2,
  },
  {
    id: 'flash-guard',
    name: 'Flash Guard',
    category: 'Photography',
    description: 'Diffuser for on-camera flash to soften light and reduce harsh shadows.',
    imageUrl: 'https://placehold.co/600x400.png',
    quantity: 1,
  },
  {
    id: 'laminator',
    name: 'Laminator',
    category: 'Office Equipment',
    description: 'A4 size laminating machine for preserving documents.',
    imageUrl: 'https://placehold.co/600x400.png',
    quantity: 1,
  },
  {
    id: 'projector',
    name: 'Projector',
    category: 'Electronics',
    description: 'Portable HD projector with HDMI and USB inputs. Includes remote and power cable.',
    imageUrl: 'https://placehold.co/600x400.png',
    quantity: 1,
  },
  {
    id: 'ippt-chip-box',
    name: 'IPPT Chip Box (With Chips)',
    category: 'Training Equipment',
    description: 'A full box of electronic timing chips for IPPT.',
    imageUrl: 'https://placehold.co/600x400.png',
    quantity: 1,
  },
];
