import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search as SearchIcon, X } from "lucide-react-native";
import { api, StashItem } from "@/src/lib/api";
import { colors } from "@/src/lib/theme";
import { StashCard } from "@/src/components/StashCard";

export default function SearchScreen() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<StashItem[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<any>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) {
      setItems([]);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const r = await api.get<StashItem[]>("/stashes/search", { params: { q } });
        setItems(r.data);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => timer.current && clearTimeout(timer.current);
  }, [q]);

  return (
    <SafeAreaView style={styles.container} testID="search-screen" edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchBox}>
          <SearchIcon color={colors.textMuted} size={18} />
          <TextInput
            testID="search-input"
            value={q}
            onChangeText={setQ}
            placeholder="Search titles, tags, notes…"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {q ? (
            <TouchableOpacity testID="search-clear" onPress={() => setQ("")}>
              <X color={colors.textMuted} size={18} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => <StashCard item={item} />}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.empty} testID="search-empty">
              <Text style={styles.emptyTitle}>
                {q ? "No matches" : "Find anything in your stash"}
              </Text>
              <Text style={styles.emptySub}>
                {q
                  ? "Try a different keyword, tag, or category."
                  : "Search by title, tag, category, or anything inside your saved notes."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, color: colors.text, fontSize: 15 },
  list: { padding: 20, paddingBottom: 120 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { paddingTop: 60, paddingHorizontal: 40, alignItems: "center" },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
