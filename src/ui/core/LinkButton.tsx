import Link from "next/link";
import type * as React from "react";
import { buttonClassName, type ButtonProps } from "../shadcn/button";

const EXTERNAL_HREF_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

function isExternalHref(href: string) {
  return EXTERNAL_HREF_PATTERN.test(href) || href.startsWith("//");
}

type LinkButtonProps = Omit<ButtonProps, "asChild" | "type"> &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className" | "href"> & {
  href: string;
};

export function LinkButton({
  children,
  className,
  href,
  size = "default",
  target,
  variant = "primary",
  weight = "solid",
  ...props
}: LinkButtonProps) {
  const classes = buttonClassName({ className, size, variant, weight });

  if (isExternalHref(href)) {
    const rel = target === "_blank" ? "noreferrer noopener" : props.rel;

    return (
      <a className={classes} href={href} rel={rel} target={target} {...props}>
        {children}
      </a>
    );
  }

  return (
    <Link className={classes} href={href} target={target} {...props}>
      {children}
    </Link>
  );
}
