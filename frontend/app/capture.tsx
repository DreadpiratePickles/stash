import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { X, Camera, Link as LinkIcon, FileText, Mic, MapPin, Image as ImageIcon, Sparkles } from "lucide-react-native";
import { api } from "@/src/lib/api";
import { colors } from "@/src/lib/theme";

type Mode = "menu" | "screenshot" | "link" | "text";

export default function Capture() {
  const [mode, setMode] = useState<Mode>("menu");
  const [image, setImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [attachLocation, setAttachLocation] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) {
        Alert.alert(
          "Photo access blocked",
          "Open Settings to allow Stash to import screenshots.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
      }
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      const a = result.assets[0];
      setImage(a.uri);
      setImageBase64(a.base64 || null);
      setMode("screenshot");
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) {
        Alert.alert("Camera blocked", "Open Settings to allow camera.", [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]);
      }
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      const a = result.assets[0];
      setImage(a.uri);
      setImageBase64(a.base64 || null);
      setMode("screenshot");
    }
  };

  const toggleLocation = async () => {
    if (attachLocation) {
      setAttachLocation(false);
      setCoords(null);
      return;
    }
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) {
        Alert.alert("Location blocked", "Open Settings to attach location.", [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]);
      }
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setAttachLocation(true);
    } catch {
      Alert.alert("Couldn't fetch location");
    }
  };

  const save = async () => {
    if (mode === "menu") return;
    if (mode === "screenshot" && !imageBase64) {
      Alert.alert("Pick or capture a screenshot first");
      return;
    }
    if ((mode === "link" || mode === "text") && !text.trim()) {
      Alert.alert("Add some content first");
      return;
    }
    setBusy(true);
    try {
      const payload: any = {
        type: mode,
        raw_text: text.trim() || null,
        image_base64: imageBase64,
        note: note.trim() || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      };
      const r = await api.post("/stashes", payload);
      router.replace(`/stash/${r.data.id}`);
    } catch (e: any) {
      Alert.alert("Save failed", e?.response?.data?.detail || "Try again");
    } finally {
      setBusy(false);
    }
  };

  const renderMenu = () => (
    <View style={styles.menuWrap}>
      <Text style={styles.menuTitle}>What are you stashing?</Text>
      <Text style={styles.menuSub}>
        Stash will auto-categorize and extract details with AI.
      </Text>

      <View style={styles.grid}>
        <TouchableOpacity
          testID="capture-screenshot-btn"
          style={styles.gridItem}
          onPress={pickImage}
        >
          <View style={[styles.gridIcon, { backgroundColor: "#f472b622" }]}>
            <ImageIcon color="#f472b6" size={24} strokeWidth={2.4} />
          </View>
          <Text style={styles.gridLabel}>Screenshot</Text>
          <Text style={styles.gridSub}>From your library</Text>
        </TouchableOpacity>

        <TouchableOpacity testID="capture-camera-btn" style={styles.gridItem} onPress={takePhoto}>
          <View style={[styles.gridIcon, { backgroundColor: "#22d3ee22" }]}>
            <Camera color="#22d3ee" size={24} strokeWidth={2.4} />
          </View>
          <Text style={styles.gridLabel}>Camera</Text>
          <Text style={styles.gridSub}>Snap it now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="capture-link-btn"
          style={styles.gridItem}
          onPress={() => setMode("link")}
        >
          <View style={[styles.gridIcon, { backgroundColor: "#a78bfa22" }]}>
            <LinkIcon color="#a78bfa" size={24} strokeWidth={2.4} />
          </View>
          <Text style={styles.gridLabel}>Link</Text>
          <Text style={styles.gridSub}>Paste a URL</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="capture-text-btn"
          style={styles.gridItem}
          onPress={() => setMode("text")}
        >
          <View style={[styles.gridIcon, { backgroundColor: "#34d39922" }]}>
            <FileText color="#34d399" size={24} strokeWidth={2.4} />
          </View>
          <Text style={styles.gridLabel}>Note</Text>
          <Text style={styles.gridSub}>Type or paste text</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tipBox}>
        <Sparkles color={colors.brand} size={16} />
        <Text style={styles.tipText}>
          Tip: Stash screenshots from TikTok, Instagram, Spotify — AI will pull out the title,
          venue, or artist.
        </Text>
      </View>
    </View>
  );

  const renderForm = () => (
    <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
      {mode === "screenshot" && image ? (
        <View style={styles.imagePreviewWrap}>
          <Image source={{ uri: image }} style={styles.imagePreview} />
        </View>
      ) : null}

      {(mode === "link" || mode === "text") ? (
        <>
          <Text style={styles.label}>{mode === "link" ? "Link or text" : "Your note"}</Text>
          <TextInput
            testID="capture-text-input"
            value={text}
            onChangeText={setText}
            placeholder={
              mode === "link"
                ? "https://… or paste anything"
                : "What's the idea? What did you want to remember?"
            }
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { minHeight: mode === "text" ? 140 : 60 }]}
            multiline={mode === "text"}
            autoCapitalize="none"
          />
        </>
      ) : null}

      <Text style={styles.label}>Add a note (optional)</Text>
      <TextInput
        testID="capture-note-input"
        value={note}
        onChangeText={setNote}
        placeholder="Why are you saving this?"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { minHeight: 70 }]}
        multiline
      />

      <TouchableOpacity
        testID="toggle-location-btn"
        style={[styles.locationRow, attachLocation && styles.locationRowActive]}
        onPress={toggleLocation}
      >
        <MapPin
          color={attachLocation ? colors.brand : colors.textSecondary}
          size={18}
          strokeWidth={2.4}
        />
        <Text style={[styles.locationText, attachLocation && { color: colors.brand }]}>
          {attachLocation ? "Location attached" : "Attach my location"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="capture-save-btn"
        style={[styles.saveBtn, busy && { opacity: 0.6 }]}
        onPress={save}
        disabled={busy}
      >
        {busy ? (
          <View style={styles.savingRow}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.saveText}>AI is enriching…</Text>
          </View>
        ) : (
          <Text style={styles.saveText}>Stash it</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        testID="capture-back-to-menu"
        onPress={() => {
          setMode("menu");
          setImage(null);
          setImageBase64(null);
          setText("");
        }}
        style={{ alignSelf: "center", marginTop: 16 }}
      >
        <Text style={styles.muted}>← Choose another type</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} testID="capture-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === "menu"
              ? "New Stash"
              : mode === "screenshot"
              ? "Stash Screenshot"
              : mode === "link"
              ? "Stash Link"
              : "Stash Note"}
          </Text>
          <TouchableOpacity
            testID="capture-close-btn"
            style={styles.closeBtn}
            onPress={() => router.back()}
          >
            <X color={colors.text} size={22} />
          </TouchableOpacity>
        </View>

        {mode === "menu" ? renderMenu() : renderForm()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuWrap: { paddingHorizontal: 20, paddingTop: 8 },
  menuTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  menuSub: { color: colors.textSecondary, marginTop: 6, marginBottom: 22 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridItem: {
    flexBasis: "48%",
    flexGrow: 1,
    padding: 18,
    borderRadius: 18,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  gridLabel: { color: colors.text, fontSize: 16, fontWeight: "700" },
  gridSub: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  tipBox: {
    marginTop: 24,
    padding: 14,
    backgroundColor: colors.brand + "11",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.brand + "55",
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  tipText: { color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, flex: 1 },
  formScroll: { padding: 20, paddingBottom: 80 },
  imagePreviewWrap: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imagePreview: { width: "100%", aspectRatio: 9 / 16, maxHeight: 320, backgroundColor: colors.bgElevated },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 14,
    padding: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
    textAlignVertical: "top",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    marginTop: 18,
    backgroundColor: colors.bgSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationRowActive: { borderColor: colors.brand, backgroundColor: colors.brand + "11" },
  locationText: { color: colors.textSecondary, fontWeight: "600" },
  saveBtn: {
    marginTop: 24,
    backgroundColor: colors.brand,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: colors.brand,
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  savingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  muted: { color: colors.textMuted },
});
