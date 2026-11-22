import Image from 'next/image';

import { cn } from '@/lib/cn';

type BrandMarkProps = {
  variant?: 'default' | 'white';
  /** Rendered height in px; width follows the lockup's 146:28 proportions. */
  size?: number;
  /** Rendered height in px below sm. Defaults to `size`. */
  mobileSize?: number;
  /** Pass a real label when nothing else on the page names the product. Defaults to decorative. */
  alt?: string;
  className?: string;
};

// Figma `10 — Logo` → Logo/Lockup (146 × 28), text outlined so it never
// depends on a loaded font. One file per tone; it scales to any size.
const ASPECT_RATIO = 146 / 28;

const SRC: Record<'default' | 'white', string> = {
  default: '/logo/buildbridge-logo.svg',
  white: '/logo/buildbridge-logo-white.svg',
};

/**
 * The one place that should reference `public/logo/*` directly — see
 * design-system.md's Logo & Brand Assets section.
 */
export function BrandMark({ variant = 'default', size = 28, mobileSize, alt = '', className }: BrandMarkProps) {
  const src = SRC[variant];

  if (mobileSize === undefined || mobileSize === size) {
    return (
      <Image src={src} alt={alt} width={Math.round(size * ASPECT_RATIO)} height={size} className={className} unoptimized />
    );
  }

  return (
    <>
      <Image
        src={src}
        alt={alt}
        width={Math.round(size * ASPECT_RATIO)}
        height={size}
        className={cn('hidden sm:block', className)}
        unoptimized
      />
      <Image
        src={src}
        alt={alt}
        width={Math.round(mobileSize * ASPECT_RATIO)}
        height={mobileSize}
        className={cn('block sm:hidden', className)}
        unoptimized
      />
    </>
  );
}
