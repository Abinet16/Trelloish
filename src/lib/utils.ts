import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export const getInitials = (email: string = ""): string => {
  if (!email) return "??";
  const parts = email
    .split("@")[0]
    .replace(/[^a-zA-Z0-9]/g, " ") // Replace non-alphanumeric with space
    .split(" ")
    .filter(Boolean) // Remove empty strings
    .map((part) => part[0])
    .join("");

  return (
    parts.length > 2 ? parts.substring(0, 2) : parts || email[0]
  ).toUpperCase();
};
