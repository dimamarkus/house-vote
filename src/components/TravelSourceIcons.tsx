import Image from 'next/image';
import { cn } from '../ui/utils/cn';

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
    <Image
      src="/vrbo-logo.png"
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={className}
    />
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
      src="/vrbo-logotype.svg"
      alt=""
      aria-hidden
      width={44}
      height={14}
      className={cn('shrink-0', className)}
    />
  );
}
