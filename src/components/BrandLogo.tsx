import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  /** Tailwind height class for the logo image (e.g. h-8). */
  heightClass?: string;
  priority?: boolean;
  /** @deprecated CSS wordmark removed — image logo is always used. */
  withWordmark?: boolean;
  /** @deprecated */
  wordmarkClassName?: string;
  /** @deprecated Prefer heightClass. Kept for call-site compatibility. */
  sizeClass?: string;
  /** `white` for dark backgrounds; default black wordmark for light UI. */
  variant?: "wordmark" | "image" | "footer" | "white" | "mark";
};

const SRC = {
  black: "/Logo.png",
  white: "/logo-white.png",
  mark: "/logo-mark.png",
} as const;

function resolveHeightClass(heightClass?: string, sizeClass?: string, variant?: BrandLogoProps["variant"]) {
  if (heightClass) return heightClass;
  if (variant === "footer") return "h-8 sm:h-9";
  if (variant === "mark") return "h-8 w-auto";
  if (sizeClass?.includes("text-lg") || sizeClass?.includes("text-xl") || sizeClass?.includes("text-2xl")) {
    return "h-7 sm:h-8";
  }
  if (sizeClass?.includes("text-base") || sizeClass?.includes("text-sm")) {
    return "h-6 sm:h-7";
  }
  return "h-7 sm:h-8";
}

export function BrandLogo({
  className = "",
  heightClass,
  priority = false,
  sizeClass,
  variant = "wordmark",
}: BrandLogoProps) {
  const isMark = variant === "mark";
  const isWhite = variant === "white";
  const src = isMark ? SRC.mark : isWhite ? SRC.white : SRC.black;
  const resolvedHeight = resolveHeightClass(heightClass, sizeClass, variant);
  const imageClass = ["w-auto object-contain object-left", resolvedHeight, className].filter(Boolean).join(" ");

  return (
    <Image
      src={src}
      alt="Pausibl"
      width={isMark ? 48 : 260}
      height={isMark ? 68 : 52}
      priority={priority}
      className={imageClass.trim()}
    />
  );
}
