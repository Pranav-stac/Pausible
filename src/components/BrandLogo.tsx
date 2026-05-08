import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  /** Tailwind height class e.g. h-8 */
  heightClass?: string;
  priority?: boolean;
  /** Show “Pausible” beside the mark */
  withWordmark?: boolean;
  /** Classes for the wordmark (color/size) */
  wordmarkClassName?: string;
};

export function BrandLogo({
  className = "",
  heightClass = "h-8",
  priority = false,
  withWordmark = false,
  wordmarkClassName = "",
}: BrandLogoProps) {
  const imageClass = [
    "w-auto object-contain object-left",
    withWordmark && "shrink-0",
    heightClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const image = (
    <Image
      src="/Logo.png"
      alt={withWordmark ? "" : "Pausible"}
      width={200}
      height={48}
      priority={priority}
      aria-hidden={withWordmark}
      className={imageClass.trim()}
    />
  );

  if (!withWordmark) return image;

  return (
    <span className="inline-flex items-center gap-2 sm:gap-2.5">
      {image}
      <span className={`font-semibold tracking-tight text-slate-900 ${wordmarkClassName}`.trim()}>Pausible</span>
    </span>
  );
}
