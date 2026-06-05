import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import API from "../services/api";
import { colors, spacing, radii } from "../constants/layout";

const SUGGESTED_CHIPS = [
  "How much did I spend in total?",
  "Show category breakdown",
  "What is my highest expense?",
  "Give me a budget tip",
];

export default function ChatbotScreen({ route }) {
  const { token } = route.params;
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      text: "Hello! I am your Smart Finance Assistant. 🤖\n\nHow can I help you analyze your transactions today? Tap one of the suggestions below or type a custom question.",
      sender: "bot",
      time: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const flatListRef = useRef(null);

  const scrollToBottom = () => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text) return;

    if (!textToSend) {
      setInputMessage("");
    }

    const userMsg = {
      id: Math.random().toString(),
      text,
      sender: "user",
      time: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await API.post(
        "/chat",
        { message: text },
        { headers: { Authorization: token } }
      );

      const botMsg = {
        id: Math.random().toString(),
        text: res.data.reply,
        sender: "bot",
        time: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.log(err);
      const errMsg = {
        id: Math.random().toString(),
        text: "Sorry, I couldn't reach the server. Please verify the backend is running.",
        sender: "bot",
        time: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessageItem = ({ item }) => {
    const isUser = item.sender === "user";
    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.userMessageRow : styles.botMessageRow,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.botBubble,
            item.isError && styles.errorBubble,
          ]}
        >
          <Text style={isUser ? styles.userText : styles.botText}>
            {item.text}
          </Text>
          <Text style={[styles.timeText, isUser ? styles.userTimeText : styles.botTimeText]}>
            {item.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Messages list */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Analyzing your finances...</Text>
              </View>
            )
          }
        />

        {/* Suggested chips row */}
        {!loading && (
          <View style={styles.chipsWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {SUGGESTED_CHIPS.map((chip, idx) => (
                <Pressable
                  key={idx}
                  style={styles.chip}
                  onPress={() => handleSendMessage(chip)}
                >
                  <Text style={styles.chipText}>{chip}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Message Input Panel */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Ask anything about your expenses..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={300}
            onSubmitEditing={() => handleSendMessage()}
            blurOnSubmit={true}
          />
          <Pressable
            style={[
              styles.sendButton,
              !inputMessage.trim() && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSendMessage()}
            disabled={!inputMessage.trim() || loading}
          >
            <Feather
              name="send"
              size={18}
              color={inputMessage.trim() ? "#FFFFFF" : "#94A3B8"}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: "flex-end",
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: "row",
    marginVertical: spacing.xs,
    width: "100%",
  },
  userMessageRow: {
    justifyContent: "flex-end",
  },
  botMessageRow: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: spacing.xs,
  },
  botBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: spacing.xs,
  },
  errorBubble: {
    borderColor: colors.danger,
    backgroundColor: "#FEF2F2",
  },
  userText: {
    fontSize: 15,
    color: "#FFFFFF",
    lineHeight: 21,
  },
  botText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 21,
  },
  timeText: {
    fontSize: 10,
    marginTop: spacing.xs,
    alignSelf: "flex-end",
  },
  userTimeText: {
    color: "#B2DFDB",
  },
  botTimeText: {
    color: colors.textMuted,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    marginVertical: spacing.xs,
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  chipsWrap: {
    backgroundColor: "transparent",
    paddingVertical: spacing.xs,
  },
  chipsScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  chipText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "web" ? 10 : 8,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#F1F5F9",
  },
});
