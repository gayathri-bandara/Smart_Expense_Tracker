import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  Alert,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import API from "../services/api";
import { colors, spacing, radii } from "../constants/layout";

export default function AddTransactionScreen({ route, navigation }) {
  const { token } = route.params;

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("expense");
  const [date, setDate] = useState("");
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !amount.trim() || !category.trim() || !date.trim()) {
      Alert.alert("Missing fields", "Fill in title, amount, category, and date.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("amount", amount.trim());
    formData.append("category", category.trim());
    formData.append("type", type);
    formData.append("date", date.trim());

    if (image) {
      formData.append("receipt", {
        uri: image,
        name: "photo.jpg",
        type: "image/jpeg",
      });
    }

    setSubmitting(true);
    try {
      await API.post("/transactions", formData, {
        headers: {
          Authorization: token,
          "Content-Type": "multipart/form-data",
        },
      });

      Alert.alert("Success", "Transaction added.");
      navigation.goBack();
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Could not add transaction. Check the backend is running.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Groceries"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 45.50"
            placeholderTextColor={colors.textMuted}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Category</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Food"
            placeholderTextColor={colors.textMuted}
            value={category}
            onChangeText={setCategory}
          />

          <Text style={styles.label}>Type</Text>
          <View style={styles.typeRow}>
            <Pressable
              style={[styles.typeChip, type === "expense" && styles.typeChipActive]}
              onPress={() => setType("expense")}
            >
              <Text
                style={[
                  styles.typeChipText,
                  type === "expense" && styles.typeChipTextActive,
                ]}
              >
                Expense
              </Text>
            </Pressable>
            <Pressable
              style={[styles.typeChip, type === "income" && styles.typeChipActive]}
              onPress={() => setType("income")}
            >
              <Text
                style={[
                  styles.typeChipText,
                  type === "income" && styles.typeChipTextActive,
                ]}
              >
                Income
              </Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            value={date}
            onChangeText={setDate}
          />

          <Pressable style={styles.outlineButton} onPress={pickImage}>
            <Text style={styles.outlineButtonText}>
              {image ? "Change receipt photo" : "Attach receipt photo"}
            </Text>
          </Pressable>

          {image ? (
            <Image source={{ uri: image }} style={styles.preview} resizeMode="cover" />
          ) : null}

          <Pressable
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? "Saving…" : "Save transaction"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "web" ? 12 : 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: "#FAFFFE",
    minHeight: 48,
  },
  typeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: "#FAFFFE",
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    fontWeight: "600",
    color: colors.text,
  },
  typeChipTextActive: {
    color: "#FFFFFF",
  },
  outlineButton: {
    marginTop: spacing.lg,
    paddingVertical: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
  },
  outlineButtonText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 15,
  },
  preview: {
    marginTop: spacing.md,
    width: "100%",
    height: 200,
    borderRadius: radii.sm,
    backgroundColor: "#E2E8F0",
  },
  primaryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
