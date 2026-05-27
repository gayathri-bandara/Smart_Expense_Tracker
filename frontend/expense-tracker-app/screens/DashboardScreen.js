import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Image,
  Dimensions,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { PieChart } from "react-native-chart-kit";
import API, { getUploadsBaseUrl } from "../services/api";
import { colors, spacing, radii } from "../constants/layout";
import { Feather } from "@expo/vector-icons";

const CHART_COLORS = ["#0F766E", "#0369A1", "#CA8A04", "#BE123C", "#7C3AED"];

export default function DashboardScreen({ route, navigation }) {
  const { token } = route.params;
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const screenWidth = Dimensions.get("window").width;
  const chartWidth = Math.min(screenWidth - spacing.lg * 2, 400);

  const fetchTransactions = async () => {
    try {
      const res = await API.get("/transactions", {
        headers: { Authorization: token },
      });
      setTransactions(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [token])
  );

  const handleDeleteTransaction = (id) => {
    const performDelete = async () => {
      try {
        await API.delete(`/transactions/${id}`, {
          headers: { Authorization: token },
        });
        if (Platform.OS === "web") {
          window.alert("Transaction deleted.");
        } else {
          Alert.alert("Success", "Transaction deleted.");
        }
        fetchTransactions();
      } catch (err) {
        console.log(err);
        if (Platform.OS === "web") {
          window.alert("Could not delete transaction.");
        } else {
          Alert.alert("Error", "Could not delete transaction.");
        }
      }
    };

    if (Platform.OS === "web") {
      const confirmDelete = window.confirm("Are you sure you want to delete this transaction?");
      if (confirmDelete) {
        performDelete();
      }
    } else {
      Alert.alert(
        "Delete transaction",
        "Are you sure you want to delete this transaction?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: performDelete,
          },
        ]
      );
    }
  };

  const getCategoryData = () => {
    const data = {};

    transactions.forEach((item) => {
      if (item.type === "expense") {
        data[item.category] = (data[item.category] || 0) + Number(item.amount);
      }
    });

    return Object.keys(data).map((key, index) => ({
      name: key,
      amount: data[key],
      color: CHART_COLORS[index % CHART_COLORS.length],
      legendFontColor: colors.text,
      legendFontSize: 13,
    }));
  };

  const chartData = getCategoryData();

  const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString();
  };

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      <Text style={styles.welcome}>Your overview</Text>
      <Text style={styles.summary}>
        {transactions.length} transaction{transactions.length === 1 ? "" : "s"}
      </Text>

      <Pressable
        style={styles.addButton}
        onPress={() => navigation.navigate("AddTransaction", { token })}
      >
        <Text style={styles.addButtonText}>+ Add transaction</Text>
      </Pressable>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerBlock}>
      <Text style={styles.sectionTitle}>Expense breakdown</Text>
      {chartData.length > 0 ? (
        <View style={styles.chartWrap}>
          <PieChart
            data={chartData}
            width={chartWidth}
            height={220}
            chartConfig={{
              color: () => colors.text,
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="12"
            absolute
          />
        </View>
      ) : (
        <Text style={styles.emptyChart}>
          Add expense transactions to see a category chart.
        </Text>
      )}
    </View>
  );

  const renderTransactionCard = ({ item }) => (
    <View style={styles.horizontalCard}>
      {item.receiptImage ? (
        <Image
          source={{
            uri: `${getUploadsBaseUrl()}/uploads/${item.receiptImage}`,
          }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.thumbnailPlaceholder} />
      )}
      <View style={styles.horizontalCardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text
          style={[
            styles.amount,
            item.type === "income" ? styles.income : styles.expense,
          ]}
          numberOfLines={1}
        >
          {item.type === "income" ? "+" : "-"}Rs. {Number(item.amount).toFixed(2)}
        </Text>
        <Text style={styles.meta} numberOfLines={2}>
          {item.category} · {formatDate(item.date)}
        </Text>
      </View>
      <View style={styles.actionsColumn}>
        <Pressable
          style={styles.actionButton}
          onPress={() => navigation.navigate("EditTransaction", { transaction: item, token })}
        >
          <Feather name="edit-2" size={14} color={colors.primary} />
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteTransaction(item._id)}
        >
          <Feather name="trash-2" size={14} color={colors.expense} />
        </Pressable>
      </View>
    </View>
  );

  const renderTransactionsList = () => {
    if (transactions.length === 0) {
      return (
        <Text style={styles.emptyList}>
          No transactions yet. Add your first one.
        </Text>
      );
    }

    return (
      <FlatList
        horizontal
        data={transactions}
        keyExtractor={(item) => item._id}
        renderItem={renderTransactionCard}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListContent}
        nestedScrollEnabled
      />
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        <Text style={styles.sectionTitle}>Transactions</Text>
        {renderTransactionsList()}
        {renderFooter()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerBlock: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  welcome: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  summary: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.textMuted,
  },
  addButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: "center",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  horizontalListContent: {
    paddingBottom: spacing.sm,
    paddingRight: spacing.md,
  },
  horizontalCard: {
    width: 245,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  actionsColumn: {
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
  },
  actionButton: {
    padding: 6,
    borderRadius: radii.sm,
    backgroundColor: "#F1F5F9",
  },
  deleteButton: {
    backgroundColor: "#FEF2F2",
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    backgroundColor: "#E2E8F0",
  },
  thumbnailPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    backgroundColor: "#E2E8F0",
  },
  horizontalCardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
  },
  income: {
    color: colors.income,
  },
  expense: {
    color: colors.expense,
  },
  meta: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyList: {
    textAlign: "center",
    color: colors.textMuted,
    paddingVertical: spacing.lg,
    fontSize: 15,
  },
  footerBlock: {
    marginTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  chartWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  emptyChart: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
