import Image from 'next/image';
import { cn } from '../compat/ui/utils/cn';

interface TravelSourceIconProps {
  className?: string;
  size?: number;
}

export function AirbnbIcon({ className, size = 16 }: TravelSourceIconProps) {
  return (
    <Image
      src="/airbnb-logo.svg"
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={className}
    />
  );
}

export function GlobeIcon({ className, size = 16 }: TravelSourceIconProps) {
  return (
    <Image
      src="/globe.svg"
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={className}
    />
  );
}

export function VrboIcon({ className, size = 16 }: TravelSourceIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path d="M21.28 4.92v14.16c0 1.67-1.37 3.04-3.04 3.04H5.76c-1.67 0-3.04-1.37-3.04-3.04V4.92c0-1.67 1.37-3.04 3.04-3.04h12.48c1.67 0 3.04 1.37 3.04 3.04zm-8.44 6.56l1.49-4.74c.64-2.02-2.01-3.28-3.1-1.5l-5.27 8.56c-1.02 1.65.79 3.53 2.41 2.51l2.76-1.74c.6-.38 1.37-.27 1.86.27l2.13 2.36c1.09 1.21 3-.17 2.55-1.86l-1.66-5c-.18-.53-.66-.91-1.21-.91l.04.05z" />
    </svg>
  );
}

interface TravelSourceLogotypeProps {
  className?: string;
}

export function AirbnbLogotype({ className }: TravelSourceLogotypeProps) {
  return (
    <Image
      src="/airbnb-logotype.svg"
      alt=""
      aria-hidden
      width={45}
      height={14}
      className={cn('shrink-0', className)}
    />
  );
}

export function VrboLogotype({ className }: TravelSourceLogotypeProps) {
  return (
    <Image
      src="/Vrbo.svg"
      alt=""
      aria-hidden
      width={44}
      height={14}
      className={cn('shrink-0', className)}
    />
  );
}
