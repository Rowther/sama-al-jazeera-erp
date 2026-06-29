import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "AED 0.00"
  return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().substring(0, 8).toUpperCase()
  }
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.substring(0, length) + '...'
}
