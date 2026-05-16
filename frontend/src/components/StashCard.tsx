import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { router } from "expo-router";
import { Image as ImageIcon } from "lucide-react-native";
import { colors, getCategoryMeta } from "@/src/lib/theme";
import { StashItem } from "@/src/lib/api";

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
}

export function StashCard({ item }: { item: StashItem }) {
  const meta = getCategoryMeta(item.category);
  const Icon = meta.Icon;

  return (
    <TouchableOpacity
      testID={`stash-card-${item.id}`}
      activeOpacity={0.85}
      onPress={() => router.push(`/stash/${item.id}`)}
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: meta.tint + "22" }]}>
          <Icon color={meta.tint} size={18} strokeWidth={2.4} />
        </View>
        <Text style={styles.category}>{meta.label}</Text>
        <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
      </View>

      {item.image_base64 ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
          style={styles.thumb}
        />
      ) : null}

      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>

      {item.summary ? (
        <Text style={styles.summary} numberOfLines={3}>
          {item.summary}
        </Text>
      ) : null}

      {item.tags && item.tags.length > 0 ? (
        <View style={styles.tagsRow}>
          {item.tags.slice(0, 4).map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  category: {
    marginLeft: 10,
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "600",
    flex: 1,
  },
  time: { color: colors.textMuted, fontSize: 12 },
  thumb: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: colors.bgElevated,
  },
  title: { color: colors.text, fontSize: 17, fontWeight: "700", lineHeight: 22 },
  summary: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 12, gap: 6 },
  tag: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: { color: colors.textSecondary, fontSize: 11, fontWeight: "500" },
});
