import * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import {
  LayoutGrid,
  Link as LinkIcon,
  List,
  MapPin,
  Plus,
  Settings,
} from "lucide-react";
import { cn } from "../utils/cn";

export type ButtonVariant = "primary" | "neutral" | "destructive";
export type ButtonWeight = "solid" | "hollow" | "ghost" | "link";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

const iconMap = {
  "layout-grid": LayoutGrid,
  link: LinkIcon,
  list: List,
  "map-pin": MapPin,
  plus: Plus,
  settings: Settings,
} as const;

function getVariantClasses(variant: ButtonVariant, weight: ButtonWeight) {
  if (weight === "link") {
    return "bg-transparent text-primary underline-offset-4 hover:underline";
  }

  if (weight === "ghost") {
    return "bg-transparent hover:bg-accent hover:text-accent-foreground";
  }

  if (weight === "hollow") {
    if (variant === "destructive") {
      return "border border-destructive text-destructive hover:bg-destructive/10";
    }

    return "border border-input bg-background hover:bg-accent hover:text-accent-foreground";
  }

  if (variant === "destructive") {
    return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
  }

  if (variant === "neutral") {
    return "bg-secondary text-secondary-foreground hover:bg-secondary/80";
  }

  return "bg-primary text-primary-foreground hover:bg-primary/90";
}

function getSizeClasses(size: ButtonSize) {
  if (size === "sm") {
    return "h-8 rounded-md px-3 text-xs";
  }

  if (size === "lg") {
    return "h-10 rounded-md px-8";
  }

  if (size === "icon") {
    return "size-9 rounded-md";
  }

  return "h-9 rounded-md px-4 py-2";
}

type ButtonClassNameProps = {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
  weight?: ButtonWeight;
};

export function buttonClassName({
  className,
  size = "default",
  variant = "primary",
  weight = "solid",
}: ButtonClassNameProps) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background",
    getVariantClasses(variant, weight),
    getSizeClasses(size),
    className,
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  icon?: keyof typeof iconMap | "";
  size?: ButtonSize;
  text?: React.ReactNode;
  variant?: ButtonVariant;
  weight?: ButtonWeight;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      asChild = false,
      children,
      className,
      icon,
      size = "default",
      text,
      type = "button",
      variant = "primary",
      weight = "solid",
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const Icon = icon ? iconMap[icon] : null;
    const content = text ?? children;
    const componentProps = asChild ? props : { ...props, type };

    return (
      <Comp
        ref={ref}
        className={buttonClassName({ className, size, variant, weight })}
        {...componentProps}
      >
        {Icon ? <Icon className="h-4 w-4" /> : null}
        {asChild ? <Slottable>{children}</Slottable> : content}
      </Comp>
    );
  },
);

Button.displayName = "Button";
