import { cn } from "@/lib/utils";
import { getBrandMonogram } from "@/lib/brand";

export function BrandMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-8 w-8 text-[10px] rounded-lg",
    md: "h-12 w-12 text-sm rounded-xl",
    lg: "h-16 w-16 text-lg rounded-2xl",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center font-bold text-white",
        sizes[size],
        className,
      )}
      style={{
        background: "linear-gradient(135deg, #2DD4BF 0%, #06B6D4 100%)",
      }}
      aria-hidden
    >
      {getBrandMonogram()}
    </div>
  );
}
