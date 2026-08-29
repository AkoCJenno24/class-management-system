import React from 'react';
import { cn } from '@/lib/utils';

interface ClassBunLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  withText?: boolean;
  textClassName?: string;
  subtext?: string;
}

export function ClassBunLogoIcon({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn('shrink-0 select-none', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cbLogoCapPlane" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F1F5F9" />
        </linearGradient>
      </defs>

      {/* Obsidian black squircle with delicate border */}
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#09090B" />
      <rect x="4.5" y="4.5" width="55" height="55" rx="13.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />

      {/* Academic Cap Crown / Skull Base */}
      <path d="M 22 32.5 L 22 36.5 C 22 42.5 42 42.5 42 36.5 L 42 32.5 C 38 34.5 26 34.5 22 32.5 Z" fill="#FFFFFF" />

      {/* Mortarboard Top Rhombus */}
      <polygon points="32,17 51,27 32,37 13,27" fill="url(#cbLogoCapPlane)" />

      {/* Architectural facet line */}
      <line x1="32" y1="17" x2="32" y2="37" stroke="#09090B" strokeWidth="0.8" opacity="0.18" />

      {/* Center Button */}
      <circle cx="32" cy="27" r="2.2" fill="#09090B" />
      <circle cx="32" cy="27" r="1.3" fill="#FFFFFF" />

      {/* Tassel Cord */}
      <path d="M 32 27 Q 45 29 46.5 37" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />

      {/* Tassel Fringe Ribbon */}
      <polygon points="44.2,37 48.8,37 49.8,45 43.2,45" fill="#FFFFFF" />
    </svg>
  );
}

const sizeMap = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
};

export function ClassBunLogo({
  size = 'md',
  withText = false,
  textClassName,
  subtext,
  className,
  ...props
}: ClassBunLogoProps) {
  const pixelSize = typeof size === 'number' ? size : sizeMap[size];

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)} {...props}>
      <ClassBunLogoIcon size={pixelSize} />
      {withText && (
        <div className="flex flex-col text-left leading-none">
          <span className={cn('font-bold tracking-tight text-foreground flex items-center gap-0.5', textClassName || 'text-xl')}>
            <span>Class</span>
            <span className="text-primary bg-clip-text">Bun</span>
          </span>
          {subtext && (
            <span className="text-[11px] text-muted-foreground mt-0.5 font-medium">
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
