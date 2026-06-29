import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  /** @deprecated Use sizeClass for wordmark sizing */
  heightClass?: string;
  priority?: boolean;
  /** Show PAUSIBL wordmark (default true when heightClass omitted in marketing) */
  withWordmark?: boolean;
  /** @deprecated */
  wordmarkClassName?: string;
  /** Tailwind text size for wordmark */
  sizeClass?: string;
  variant?: "wordmark" | "image" | "footer";
};

function PauseMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-[3px] align-middle ${className}`.trim()}
      aria-hidden
    >
      <span className="h-[0.85em] w-[0.18em] rounded-full bg-[#00C9C8]" />
      <span className="h-[0.85em] w-[0.18em] rounded-full bg-[#2D82FF]" />
    </span>
  );
}

function PausiblWordmark({ sizeClass }: { sizeClass: string }) {
  return (
    <span
      className={`inline-flex items-center font-bold tracking-[0.06em] text-[#0D1B2A] ${sizeClass}`}
      aria-label="Pausibl"
    >
      <span>PA</span>
      <PauseMark className="mx-[0.08em]" />
      <span>SIBL</span>
    </span>
  );
}

export function BrandLogo({
  className = "",
  heightClass,
  priority = false,
  withWordmark = false,
  wordmarkClassName = "",
  sizeClass,
  variant = "wordmark",
}: BrandLogoProps) {
  const useImageOnly = variant === "image" || (Boolean(heightClass) && !withWordmark);

  if (useImageOnly) {
    const imageClass = ["w-auto object-contain object-left", heightClass ?? "h-8", className]
      .filter(Boolean)
      .join(" ");

    return (
      <Image
        src="/Logo.png"
        alt="Pausibl"
        width={48}
        height={48}
        priority={priority}
        className={imageClass.trim()}
      />
    );
  }

  const resolvedSize =
    sizeClass ??
    (variant === "footer"
      ? "text-lg sm:text-xl"
      : wordmarkClassName
        ? `font-semibold tracking-tight ${wordmarkClassName}`
        : heightClass
          ? "text-base sm:text-lg"
          : "text-xl sm:text-2xl");

  return (
    <span className={`inline-flex items-center ${className}`.trim()}>
      <PausiblWordmark sizeClass={resolvedSize} />
    </span>
  );
}
