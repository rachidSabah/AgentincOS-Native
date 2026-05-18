"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ClawHubLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export function ClawHubLogo({ size = 24, className, ...props }: ClawHubLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-primary transition-transform duration-300 hover:scale-110", className)}
      {...props}
    >
      <defs>
        <linearGradient id="claw-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.68 0.19 45)" /> {/* Claw Orange */}
          <stop offset="100%" stopColor="oklch(0.58 0.23 35)" /> {/* Luxury Deep Amber */}
        </linearGradient>
        <filter id="claw-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Three premium, sharp claws with dynamic curves */}
      <g filter="url(#claw-glow)">
        {/* Left Claw */}
        <path
          d="M6.5 3C6.8 3.8 6.8 4.8 6.6 5.8C6.3 7.4 5.3 9.2 3.9 10.5C3.6 10.8 3.5 11.3 3.7 11.7C3.9 12.1 4.4 12.3 4.8 12.1C6.8 11.3 8.6 9.9 9.8 8C10.6 6.7 11.1 5.3 11.2 3.8C11.3 3.3 10.9 2.9 10.4 2.9L6.5 3Z"
          fill="url(#claw-gradient)"
        />
        {/* Middle Claw */}
        <path
          d="M12 4C12.2 4.8 12.2 5.7 12 6.5C11.7 8 10.8 9.5 9.5 10.6C9.2 10.9 9.1 11.4 9.3 11.8C9.5 12.2 10 12.4 10.4 12.2C12.2 11.4 13.7 10 14.7 8.3C15.4 7.1 15.8 5.8 15.9 4.4C16 3.9 15.6 3.5 15.1 3.5L12 4Z"
          fill="url(#claw-gradient)"
        />
        {/* Right Claw */}
        <path
          d="M17.5 5C17.6 5.8 17.6 6.6 17.4 7.4C17.1 8.8 16.3 10.2 15.2 11.3C14.9 11.6 14.8 12.1 15 12.5C15.2 12.9 15.7 13.1 16.1 12.9C17.7 12.1 19.1 10.7 20 9.1C20.6 8 20.9 6.7 21 5.5C21.1 5 20.7 4.6 20.2 4.6L17.5 5Z"
          fill="url(#claw-gradient)"
        />
      </g>
    </svg>
  );
}

interface ClawHubTextProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ClawHubText({ className, ...props }: ClawHubTextProps) {
  return (
    <div
      className={cn(
        "font-sans font-bold tracking-tight select-none flex items-center gap-0.5",
        className
      )}
      {...props}
    >
      <span className="text-foreground transition-colors duration-200 hover:text-primary">
        Claw
      </span>
      <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent animate-pulse-glow">
        Hub
      </span>
    </div>
  );
}
