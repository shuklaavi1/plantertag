'use client';

import { useState } from 'react';
import Image from 'next/image';
import { TreePine } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export default function SafeImage({ src, alt, fill, className, width, height, priority }: SafeImageProps) {
  const [error, setError] = useState(false);

  // If there's an error loading the photo, or no src is provided, show a neutral placeholder card
  if (error || !src) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-muted text-muted-foreground border border-border/40 ${className} ${fill ? 'absolute inset-0 w-full h-full' : ''}`}
        style={!fill ? { width, height } : undefined}
      >
        <TreePine className="h-7 w-7 text-primary/30 mb-1.5 animate-pulse" />
        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
          Photo to be updated
        </span>
      </div>
    );
  }

  // Filter out typical placeholder domains that may return bad responses
  const isPlaceholder = src.includes('placehold.co') || src.includes('placeholder');
  const safeSrc = isPlaceholder ? '/demo/tree_mature.png' : src;

  return (
    <Image
      src={safeSrc}
      alt={alt}
      fill={fill}
      className={className}
      width={width}
      height={height}
      priority={priority}
      onError={() => setError(true)}
    />
  );
}
