import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** 合併條件式 className 與 Tailwind 衝突規則。 */ export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
