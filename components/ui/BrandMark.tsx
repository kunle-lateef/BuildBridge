import Image from 'next/image';

import { cn } from '@/lib/cn';

type BrandMarkProps = {
  variant?: 'default' | 'white';
  /** Rendered height in px at the sm breakpoint and up; width follows the lockup's own 6.5:1 aspect ratio. */
  size?: number;
  /** Rendered height in px below sm. Defaults to `size` — set this explicitly wherever `size` would render too wide for a phone screen (the lockup is 6.5:1, so height scales up fast). */
  mobileSize?: number;
  /** Pass a real label when nothing else on the page names the product. Defaults to decorative. */
  alt?: string;
  className?: string;
};

// The full icon+wordmark lockup — viewBox 0 0 650 100, with "BuildBridge"
// baked in as real SVG text. Not square: a 6.5:1 aspect ratio, so `size`
// below sets height only and width is derived, rather than forcing it into
// a square box (which crushes the wordmark to a sliver — see
// design-system.md's Logo & Brand Assets section, and the icon-only
// `buildbridge-icon*.svg` files kept there for contexts that want the mark
// without the wordmark).
const ASPECT_RATIO = 650 / 100;

const SRC: Record<'default' | 'white', { desktop: string; mobile: string }> = {
  default: {
    desktop: '/logo/buildbridge-logo (Desktop).svg',
    mobile: '/logo/buildbridge-logo (Mobile).svg',
  },
  white: {
    desktop: '/logo/buildbridge-logo-white (Desktop).svg',
    mobile: '/logo/buildbridge-logo-white (Mobile).svg',
  },
};

/**
 * The one place that should reference `public/logo/*` directly — see
 * design-system.md's Logo & Brand Assets section for the desktop/mobile
 * file pair per variant. Renders both cuts and toggles visibility with
 * Tailwind's `sm:` breakpoint rather than picking one in JS, so there's no
 * layout shift and no client component needed.
 */
export function BrandMark({ variant = 'default', size = 28, mobileSize, alt = '', className }: BrandMarkProps) {
  const { desktop, mobile } = SRC[variant];
  const desktopWidth = Math.round(size * ASPECT_RATIO);
  const mobileHeight = mobileSize ?? size;
  const mobileWidth = Math.round(mobileHeight * ASPECT_RATIO);

  return (
    <>
      <Image
        src={desktop}
        alt={alt}
        width={desktopWidth}
        height={size}
        className={cn('hidden sm:block', className)}
      />
      <Image
        src={mobile}
        alt={alt}
        width={mobileWidth}
        height={mobileHeight}
        className={cn('block sm:hidden', className)}
      />
    </>
  );
}
