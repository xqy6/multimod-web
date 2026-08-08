import { ImageIcon } from "lucide-react";

interface MediaPlaceholderProps {
  label: string;
  hint?: string;
  aspect?: string;
  className?: string;
}

export function MediaPlaceholder({
  label,
  hint,
  aspect = "aspect-video",
  className = "",
}: MediaPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative overflow-hidden rounded-card border border-dashed border-white/15 bg-white/[0.03] ${aspect} ${className}`}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-mist-300 ring-1 ring-white/10">
          <ImageIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium text-mist-200">{label}</p>
        {hint ? (
          <p className="max-w-sm text-xs leading-5 text-mist-400">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
