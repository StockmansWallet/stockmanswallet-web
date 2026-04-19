import Image from "next/image";

interface UserAvatarProps {
  // Display name used for the initial fallback and the image alt text.
  name: string;
  // Avatar URL from auth metadata. Null or undefined falls back to initials.
  avatarUrl?: string | null;
  // Tailwind size classes applied to the avatar square. Default 10x10.
  sizeClass?: string;
  // Rounded corner style. Producer Network rows use rounded-xl tiles while
  // chat headers and other large surfaces use full circles.
  shape?: "tile" | "circle";
  // Colour tone applied to the initials tile when no image is present.
  tone?: "producer-network" | "success" | "advisor" | "neutral";
  // Text size for the initial. Matches the tile scale.
  initialClass?: string;
}

const toneBg: Record<NonNullable<UserAvatarProps["tone"]>, string> = {
  "producer-network": "bg-producer-network/15",
  success: "bg-success/15",
  advisor: "bg-advisor/15",
  neutral: "bg-white/5",
};

const toneText: Record<NonNullable<UserAvatarProps["tone"]>, string> = {
  "producer-network": "text-producer-network-light",
  success: "text-success",
  advisor: "text-advisor",
  neutral: "text-text-primary",
};

export function UserAvatar({
  name,
  avatarUrl,
  sizeClass = "h-10 w-10",
  shape = "tile",
  tone = "producer-network",
  initialClass = "text-sm font-bold",
}: UserAvatarProps) {
  const initial = (name?.trim().charAt(0) || "?").toUpperCase();
  const radius = shape === "circle" ? "rounded-full" : "rounded-xl";

  if (avatarUrl) {
    return (
      <div className={`relative shrink-0 overflow-hidden ${radius} ${sizeClass}`}>
        <Image
          src={avatarUrl}
          alt={name}
          fill
          sizes="56px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center ${radius} ${sizeClass} ${toneBg[tone]}`}
      aria-hidden="true"
    >
      <span className={`${initialClass} ${toneText[tone]}`}>{initial}</span>
    </div>
  );
}
