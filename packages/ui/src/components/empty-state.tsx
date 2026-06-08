import * as React from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Use `href` para Server Components; `onClick` para Client Components. */
  action?: { label: string; href: string; onClick?: never } | { label: string; onClick: () => void; href?: never };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-navy-200 bg-navy-50/50 px-6 py-16 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 text-navy-400">
          {icon}
        </div>
      )}
      <h3 className="mb-1 text-base font-semibold text-navy-800">{title}</h3>
      {description && (
        <p className="mb-4 max-w-sm text-sm text-navy-500">{description}</p>
      )}
      {action && (
        action.href ? (
          <Button size="sm" asChild>
            <a href={action.href}>{action.label}</a>
          </Button>
        ) : (
          <Button onClick={action.onClick} size="sm">
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}
