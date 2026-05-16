import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { Sparkles } from "lucide-react-native";
import { api, StashItem } from "@/src/lib/api";
import { colors } from "@/src/lib/theme";
import { StashCard } from "@/src/components/StashCard";

export default function Rediscover() {
  const [stashes, setStashes] = useState<StashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      let params: Record<string, number> = {};
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.granted) {
          const loc = await Location.getLastKnownPositionAsync();
          if (loc) {
            params.lat = loc.coords.latitude;
            params.lng = loc.coords.longitude;
          }
        }
      } catch {}
      const r = await api.get<StashItem[]>("/stashes/rediscover", { params });
      setStashes(r.data);
    } catch (e) {
      console.warn("rediscover failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.container} testID="rediscover-screen" edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Rediscover</Text>
        <Text style={styles.title}>What's relevant now</Text>
        <Text style={styles.sub}>
          Saves resurfaced by time of day, location, and forgotten gems.
        </Text>
      </View>

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
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.brand}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty} testID="rediscover-empty">
              <View style={styles.emptyIcon}>
                <Sparkles color={colors.brand} size={32} strokeWidth={2} />
              </View>
              <Text style={styles.emptyTitle}>Nothing to resurface yet</Text>
              <Text style={styles.emptySub}>
                Save a few stashes first. Stash will bring them back when they're relevant.
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
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  kicker: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontWeight: "600",
    marginBottom: 4,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  sub: { color: colors.textSecondary, marginTop: 8, fontSize: 14, lineHeight: 20 },
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
});
