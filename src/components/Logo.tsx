import Image from "next/image";

export default function Logo({
  size = 48,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/logo.png"
      alt="Mednaath AiOnPhone"
      width={size}
      height={size}
      priority
      className={className}
      style={{ borderRadius: "50%", display: "block" }}
    />
  );
}
