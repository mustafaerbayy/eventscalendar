import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatName(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return "";
      return word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1).toLocaleLowerCase("tr-TR");
    })
    .join(" ");
}

