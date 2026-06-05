import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import API from "../services/api";
import { colors, spacing, radii } from "../constants/layout";

// Only import expo-camera on native platforms to avoid broken web module
let CameraView = null;
let useCameraPermissions = null;
if (Platform.OS !== "web") {
  try {
    const cam = require("expo-camera");
    CameraView = cam.CameraView;
    useCameraPermissions = cam.useCameraPermissions;
  } catch (e) {
    console.warn("expo-camera not available:", e);
  }
}

export default function ReceiptScannerScreen({ route, navigation }) {
  const { token } = route.params;

  // On web, skip camera permissions entirely
  const nativePerms = Platform.OS !== "web" && useCameraPermissions ? useCameraPermissions() : null;
  const permission = nativePerms ? nativePerms[0] : null;
  const requestPermission = nativePerms ? nativePerms[1] : null;

  const [scanning, setScanning] = useState(false);
  const cameraRef = useRef(null);

  // Animation for scanner laser line
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (permission?.granted) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 2500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [permission]);

  const handleOCRScan = async (uri) => {
    setScanning(true);
    const formData = new FormData();
    formData.append("receipt", {
      uri,
      name: "receipt.jpg",
      type: "image/jpeg",
    });

    try {
      const res = await API.post("/transactions/scan", formData, {
        headers: {
          Authorization: token,
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.message) {
        if (Platform.OS === "web") {
          window.alert(res.data.message);
        } else {
          Alert.alert("Info", res.data.message);
        }
      }

      // Pass parsed details back to AddTransactionScreen
      navigation.navigate("AddTransaction", {
        token,
        scannedData: {
          title: res.data.title,
          amount: String(res.data.amount),
          category: res.data.category,
          date: res.data.date,
          image: uri, // Show local image preview
        },
      });

    } catch (err) {
      console.log(err);
      if (Platform.OS === "web") {
        window.alert("AI OCR Scan failed. Is the server running?");
      } else {
        Alert.alert("Scan Error", "Could not parse receipt using AI. Please try again.");
      }
    } finally {
      setScanning(false);
    }
  };

  const handleCapture = async () => {
    if (cameraRef.current && !scanning) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        if (photo?.uri) {
          await handleOCRScan(photo.uri);
        }
      } catch (err) {
        console.log("Capture error:", err);
      }
    }
  };

  const handlePickFile = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await handleOCRScan(result.assets[0].uri);
    }
  };

  // On native, show loading spinner while permissions are being resolved
  if (Platform.OS !== "web" && !permission) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  // Fallback to uploader if permission is not granted or we are in web simulator without camera
  if (!permission.granted && Platform.OS !== "web") {
    return (
      <SafeAreaView style={styles.centered}>
        <View style={styles.permissionCard}>
          <Feather name="camera" size={48} color={colors.primary} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan receipts and extract transaction details.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Grant Permission</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={handlePickFile}>
            <Text style={styles.secondaryBtnText}>Upload from Gallery</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const screenWidth = Dimensions.get("window").width;
  const frameWidth = Math.min(screenWidth - 40, 320);
  const frameHeight = frameWidth * 1.3;

  const laserY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, frameHeight],
  });

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      {scanning ? (
        <View style={styles.scanningOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.scanningText}>AI Receipt Scanner</Text>
          <Text style={styles.scanningSub}>Analyzing items, totals and merchants...</Text>
        </View>
      ) : (
        <View style={styles.flex}>
          {Platform.OS === "web" ? (
            <View style={styles.webUploader}>
              <Feather name="image" size={64} color={colors.primary} style={{ marginBottom: 15 }} />
              <Text style={styles.webTitle}>Receipt Scanner (Web Mode)</Text>
              <Text style={styles.webSubtitle}>
                Select a receipt image from your computer to run the AI parser.
              </Text>
              <Pressable style={styles.webBtn} onPress={handlePickFile}>
                <Text style={styles.webBtnText}>Select Receipt Image</Text>
              </Pressable>
            </View>
          ) : (
            <CameraView style={StyleSheet.absoluteFillObject} ref={cameraRef} facing="back">
              {/* Outer Translucent Overlay */}
              <View style={styles.overlayContainer}>
                <View style={styles.overlayRow} />
                
                {/* Frame Row */}
                <View style={[styles.overlayFrameRow, { height: frameHeight }]}>
                  <View style={styles.overlaySide} />
                  
                  {/* Target frame */}
                  <View style={[styles.frame, { width: frameWidth, height: frameHeight }]}>
                    {/* Corner Borders */}
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                    
                    {/* Scanning Laser */}
                    <Animated.View
                      style={[
                        styles.laserLine,
                        { transform: [{ translateY: laserY }] },
                      ]}
                    />
                  </View>
                  
                  <View style={styles.overlaySide} />
                </View>

                <View style={styles.overlayRow}>
                  <Text style={styles.guideText}>Align receipt within the frame</Text>
                </View>
              </View>

              {/* Bottom Control Bar */}
              <View style={styles.controlBar}>
                <Pressable style={styles.iconBtn} onPress={handlePickFile}>
                  <Feather name="image" size={24} color="#FFFFFF" />
                </Pressable>
                
                <Pressable style={styles.captureBtn} onPress={handleCapture}>
                  <View style={styles.captureBtnInner} />
                </Pressable>
                
                <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
                  <Feather name="x" size={24} color="#FFFFFF" />
                </Pressable>
              </View>
            </CameraView>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#000000",
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  permissionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    margin: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    width: "100%",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryBtn: {
    marginTop: spacing.sm,
    paddingVertical: 12,
    alignItems: "center",
    width: "100%",
  },
  secondaryBtnText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  scanningOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 118, 110, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  scanningText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  scanningSub: {
    color: "#B2DFDB",
    fontSize: 14,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  overlayRow: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayFrameRow: {
    flexDirection: "row",
  },
  overlaySide: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  frame: {
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "transparent",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#10B981", // Emerald green
  },
  topLeft: {
    top: -2,
    left: -2,
    borderLeftWidth: 4,
    borderTopWidth: 4,
  },
  topRight: {
    top: -2,
    right: -2,
    borderRightWidth: 4,
    borderTopWidth: 4,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderRightWidth: 4,
    borderBottomWidth: 4,
  },
  laserLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  guideText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
  },
  controlBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 110,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: spacing.sm,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  webUploader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  webTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  webSubtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xl,
    maxWidth: 400,
  },
  webBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.sm,
  },
  webBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
