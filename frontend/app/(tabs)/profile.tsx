import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { LogOut, Sparkles } from "lucide-react-native";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";
import { colors, categoryMeta } from "@/src/lib/theme";

type Stats = { total: number; by_category: Record<string, number> };

export default function Profile() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get<Stats>("/stats");
      setStats(r.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const doLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.container} testID="profile-screen" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Sparkles color={colors.brand} size={28} strokeWidth={2.5} />
          </View>
          <Text style={styles.email} testID="profile-email">
            {user?.email}
          </Text>
          {user?.is_admin ? (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>TOTAL SAVED</Text>
          {loading ? (
            <ActivityIndicator color={colors.brand} style={{ marginTop: 12 }} />
          ) : (
            <Text style={styles.statsValue} testID="profile-total">
              {stats?.total ?? 0}
            </Text>
          )}
        </View>

        <Text style={styles.sectionLabel}>BY CATEGORY</Text>
        <View style={styles.catGrid}>
          {Object.entries(categoryMeta).map(([key, m]) => {
            const Icon = m.Icon;
            const count = stats?.by_category[key] ?? 0;
            return (
              <View key={key} style={styles.catCell} testID={`profile-cat-${key}`}>
                <View style={[styles.catIcon, { backgroundColor: m.tint + "22" }]}>
                  <Icon color={m.tint} size={18} strokeWidth={2.4} />
                </View>
                <Text style={styles.catLabel}>{m.label}</Text>
                <Text style={styles.catCount}>{count}</Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity testID="logout-btn" style={styles.logoutBtn} onPress={doLogout}>
          <LogOut color={colors.error} size={18} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 120 },
  header: { alignItems: "center", marginVertical: 12 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.brand,
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    marginBottom: 14,
  },
  email: { color: colors.text, fontSize: 17, fontWeight: "700" },
  adminBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.brand + "22",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  adminBadgeText: { color: colors.brand, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  statsCard: {
    marginTop: 24,
    padding: 22,
    borderRadius: 22,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: "600",
  },
  statsValue: {
    color: colors.text,
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: -1,
    marginTop: 8,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: "600",
    marginTop: 28,
    marginBottom: 12,
  },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catCell: {
    width: "31%",
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  catLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "600" },
  catCount: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 2 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 32,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: { color: colors.error, fontWeight: "700", fontSize: 15 },
});
