import { cn } from "@/lib/utils";
import { NavLinkProps, NavLink as RouterNavLink } from "react-router-dom";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  ref?: React.Ref<HTMLAnchorElement>;
}

const NavLink = ({
  className,
  activeClassName,
  pendingClassName,
  to,
  ref,
  ...props
}: NavLinkCompatProps) => {
  return (
    <RouterNavLink
      ref={ref}
      to={to}
      className={({ isActive, isPending }) =>
        cn(
          className,
          isActive && activeClassName,
          isPending && pendingClassName,
        )
      }
      {...props}
    />
  );
};

NavLink.displayName = "NavLink";

export { NavLink };
