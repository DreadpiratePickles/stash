import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Plus, Sparkles } from "lucide-react-native";
import { api, StashItem } from "@/src/lib/api";
import { colors, categoryMeta } from "@/src/lib/theme";
import { StashCard } from "@/src/components/StashCard";

const FILTERS = ["all", "movie", "music", "place", "book", "article", "idea", "video"];

export default function FeedScreen() {
  const [stashes, setStashes] = useState<StashItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (cat: string) => {
    try {
      const r = await api.get<StashItem[]>("/stashes", {
        params: cat === "all" ? {} : { category: cat },
      });
      setStashes(r.data);
    } catch (e) {
      console.warn("load feed failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(filter);
    }, [filter, load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(filter);
  };

  return (
    <SafeAreaView style={styles.container} testID="feed-screen" edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Your Stash</Text>
          <Text style={styles.title}>Everything saved</Text>
        </View>
        <TouchableOpacity
          testID="header-rediscover-btn"
          style={styles.sparkleBtn}
          onPress={() => router.push("/(tabs)/rediscover")}
        >
          <Sparkles color={colors.brand} size={20} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => {
          const active = filter === f;
          const label =
            f === "all" ? "All" : categoryMeta[f]?.label || f;
          return (
            <TouchableOpacity
              testID={`filter-${f}`}
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={stashes}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => <StashCard item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty} testID="feed-empty">
              <View style={styles.emptyIcon}>
                <Sparkles color={colors.brand} size={32} strokeWidth={2} />
              </View>
              <Text style={styles.emptyTitle}>Your stash is empty</Text>
              <Text style={styles.emptySub}>
                Tap the + button below to save your first screenshot, link, or note.
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        testID="fab-add-stash"
        style={styles.fab}
        onPress={() => router.push("/capture")}
        activeOpacity={0.85}
      >
        <Plus color="#fff" size={28} strokeWidth={2.6} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  kicker: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontWeight: "600",
  },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  sparkleBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: colors.brand + "22",
    borderColor: colors.brand,
  },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: colors.brand },
  list: { padding: 20, paddingBottom: 120 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.brand,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    marginBottom: 20,
  },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: "700", marginBottom: 6 },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    right: 22,
    bottom: 104,
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand,
    shadowOpacity: 0.7,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
});
