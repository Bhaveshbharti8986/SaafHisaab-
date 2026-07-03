export const CROP_CONFIG = {
  wheat:   { emoji: "🌾", label: "Wheat",   badge: "bg-green-100 text-green-700 border border-green-200",    color: "text-amber-600"  },
  maize:   { emoji: "🌽", label: "Maize",   badge: "bg-yellow-100 text-yellow-700 border border-yellow-200", color: "text-yellow-600" },
  rice:    { emoji: "🍚", label: "Rice",    badge: "bg-blue-100 text-blue-700 border border-blue-200",       color: "text-blue-600"   },
  soybean: { emoji: "🫘", label: "Pulse", badge: "bg-purple-100 text-purple-700 border border-purple-200", color: "text-purple-600" },
};

export function getCropConfig(crop) {
  return CROP_CONFIG[crop] ?? CROP_CONFIG.wheat;
}

const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-teal-600", "bg-rose-600",
  "bg-indigo-600", "bg-orange-600", "bg-green-700", "bg-cyan-600",
];

export function getAvatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getInitials(name = "") {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}
