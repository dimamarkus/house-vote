import { Button, type ButtonProps } from "../shadcn/button";

type LinkButtonProps = ButtonProps & {
  href: string;
};

export function LinkButton({ children, href, ...props }: LinkButtonProps) {
  return (
    <Button asChild {...props}>
      <a href={href} rel="noreferrer" target="_blank">
        {children}
      </a>
    </Button>
  );
}
