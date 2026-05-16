import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ArrowLeft, Trash2, Save, MapPin } from "lucide-react-native";
import { api, StashItem } from "@/src/lib/api";
import { colors, getCategoryMeta } from "@/src/lib/theme";

export default function StashDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<StashItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await api.get<StashItem>(`/stashes/${id}`);
      setItem(r.data);
      setNote(r.data.note || "");
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const saveNote = async () => {
    if (!item) return;
    setSaving(true);
    try {
      const r = await api.patch<StashItem>(`/stashes/${item.id}`, { note });
      setItem(r.data);
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!item) return;
    Alert.alert("Delete stash?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await api.delete(`/stashes/${item.id}`);
          router.back();
        },
      },
    ]);
  };

  if (loading || !item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  const meta = getCategoryMeta(item.category);
  const Icon = meta.Icon;
  const metadataEntries = Object.entries(item.metadata || {}).filter(
    ([_, v]) => v != null && String(v).length > 0
  );

  return (
    <SafeAreaView style={styles.container} testID="stash-detail-screen">
      <View style={styles.header}>
        <TouchableOpacity testID="back-btn" style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft color={colors.text} size={22} />
        </TouchableOpacity>
        <TouchableOpacity testID="delete-btn" style={styles.iconBtn} onPress={remove}>
          <Trash2 color={colors.error} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.row}>
          <View style={[styles.catChip, { backgroundColor: meta.tint + "22" }]}>
            <Icon color={meta.tint} size={14} strokeWidth={2.5} />
            <Text style={[styles.catChipText, { color: meta.tint }]}>{meta.label}</Text>
          </View>
        </View>

        <Text style={styles.title} testID="stash-title">
          {item.title}
        </Text>

        {item.summary ? (
          <Text style={styles.summary} testID="stash-summary">
            {item.summary}
          </Text>
        ) : null}

        {item.image_base64 ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
            style={styles.thumb}
          />
        ) : null}

        {item.raw_text ? (
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>ORIGINAL</Text>
            <Text style={styles.metaValue}>{item.raw_text}</Text>
          </View>
        ) : null}

        {item.tags && item.tags.length > 0 ? (
          <View style={styles.tagsRow}>
            {item.tags.map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {metadataEntries.length > 0 ? (
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>EXTRACTED METADATA</Text>
            {metadataEntries.map(([k, v]) => (
              <View key={k} style={styles.metaRow}>
                <Text style={styles.metaKey}>{k}</Text>
                <Text style={styles.metaVal}>{String(v)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {item.lat != null && item.lng != null ? (
          <View style={styles.locRow}>
            <MapPin color={colors.brand} size={16} />
            <Text style={styles.locText}>
              {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
            </Text>
          </View>
        ) : null}

        <Text style={styles.noteLabel}>MY NOTE</Text>
        <TextInput
          testID="stash-note-input"
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Add your own thoughts…"
          placeholderTextColor={colors.textMuted}
        />
        <TouchableOpacity
          testID="save-note-btn"
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={saveNote}
          disabled={saving}
        >
          <Save color="#fff" size={16} />
          <Text style={styles.saveBtnText}>
            {saving ? "Saving…" : "Save note"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scroll: { padding: 20, paddingBottom: 80 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", marginBottom: 14 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  catChipText: { fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  title: { color: colors.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  summary: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 8 },
  thumb: {
    width: "100%",
    aspectRatio: 9 / 16,
    maxHeight: 360,
    borderRadius: 16,
    marginTop: 18,
    backgroundColor: colors.bgElevated,
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 16 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: { color: colors.textSecondary, fontSize: 11, fontWeight: "500" },
  metaCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: "700",
    marginBottom: 10,
  },
  metaValue: { color: colors.text, fontSize: 14, lineHeight: 20 },
  metaRow: { flexDirection: "row", paddingVertical: 6 },
  metaKey: {
    color: colors.textSecondary,
    fontSize: 12,
    width: 100,
    textTransform: "capitalize",
  },
  metaVal: { color: colors.text, fontSize: 13, flex: 1 },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: "flex-start",
  },
  locText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  noteLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: "700",
    marginTop: 22,
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 14,
    padding: 14,
    color: colors.text,
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
    textAlignVertical: "top",
  },
  saveBtn: {
    marginTop: 14,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
