import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Classes for a column that should stay pinned while the table scrolls
 * horizontally. Apply to the matching <th> and every <td> in that column.
 * The opaque `bg-card` keeps scrolling cells from showing through; the row's
 * `group` (see TableRow) lets the pinned cell follow the hover state.
 */
export const stickyColumn =
  "sticky left-0 z-10 border-r border-border bg-card group-hover:bg-muted";

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const updateFade = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // 1px slack avoids a lingering fade from sub-pixel rounding.
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateFade();
    const observer = new ResizeObserver(updateFade);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateFade]);

  return (
    <div className="relative w-full min-w-0">
      <div
        ref={scrollRef}
        className="w-full min-w-0 overflow-auto"
        onScroll={updateFade}
      >
        <table
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        />
      </div>
      {canScrollRight ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent"
        />
      ) : null}
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />;
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "group border-b transition-colors hover:bg-muted/60",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-2 align-middle", className)} {...props} />;
}
