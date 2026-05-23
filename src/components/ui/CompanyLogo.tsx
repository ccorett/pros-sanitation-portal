import Image from "next/image";

const sizeMap = {
  sm: 32,
  md: 56,
  lg: 88,
} as const;

type CompanyLogoSize = keyof typeof sizeMap;

interface CompanyLogoProps {
  size?: CompanyLogoSize;
  className?: string;
}

export function CompanyLogo({ size = "md", className = "" }: CompanyLogoProps) {
  const dimension = sizeMap[size];

  return (
    <Image
      src="/pros-sanitation-logo.svg"
      alt="Pro's Sanitation logo"
      width={dimension}
      height={dimension}
      className={className}
      priority={size === "lg"}
    />
  );
}
