"use client";

import { toast as sonnerToast, Toaster as Sonner } from "sonner";

// Hook cho phép gọi toast ở bất kỳ component nào
export function useToast() {
  return {
    toast: sonnerToast,
  };
}

// Toaster global (phải render 1 lần duy nhất ở layout/_app)
export function Toaster() {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
    />
  );
}
