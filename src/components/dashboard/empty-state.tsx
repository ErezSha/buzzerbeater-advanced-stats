import { Info } from "lucide-react";

interface EmptyStateProps {
  title: string;
  message: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="flex min-h-36 items-center justify-center rounded-md border border-dashed p-4 text-center">
      <div>
        <Info className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <div className="mt-2 font-medium">{title}</div>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
