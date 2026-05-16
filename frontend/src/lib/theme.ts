export const colors = {
  bg: "#1e1e1e",
  bgSecondary: "#252525",
  bgElevated: "#2a2a2a",
  border: "#333333",
  brand: "#7c3aed",
  brandGlow: "rgba(124, 58, 237, 0.35)",
  text: "#ffffff",
  textSecondary: "#a1a1aa",
  textMuted: "#71717a",
  success: "#22c55e",
  error: "#ef4444",
};

import {
  Film,
  Music,
  MapPin,
  BookOpen,
  Newspaper,
  Lightbulb,
  User as UserIcon,
  Video,
  Sparkles,
  Bookmark,
} from "lucide-react-native";

export const categoryMeta: Record<string, { label: string; Icon: any; tint: string }> = {
  movie: { label: "Movie", Icon: Film, tint: "#f472b6" },
  music: { label: "Music", Icon: Music, tint: "#22d3ee" },
  place: { label: "Place", Icon: MapPin, tint: "#fb923c" },
  book: { label: "Book", Icon: BookOpen, tint: "#facc15" },
  article: { label: "Article", Icon: Newspaper, tint: "#a78bfa" },
  idea: { label: "Idea", Icon: Lightbulb, tint: "#34d399" },
  person: { label: "Person", Icon: UserIcon, tint: "#f87171" },
  video: { label: "Video", Icon: Video, tint: "#60a5fa" },
  other: { label: "Other", Icon: Bookmark, tint: "#a1a1aa" },
};

export function getCategoryMeta(key?: string | null) {
  return categoryMeta[(key || "other").toLowerCase()] || categoryMeta.other;
}

export const SparklesIcon = Sparkles;
