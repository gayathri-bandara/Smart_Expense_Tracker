import React, { useState, useCallback, useLayoutEffect } from "react";
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
import { PieChart, LineChart } from "react-native-chart-kit";
import API, { getUploadsBaseUrl } from "../services/api";
import { colors, spacing, radii } from "../constants/layout";
import { Feather } from "@expo/vector-icons";

const CHART_COLORS = ["#0F766E", "#0369A1", "#CA8A04", "#BE123C", "#7C3AED"];

export default function DashboardScreen({ route, navigation }) {
  const { token } = route.params;
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => {
            if (Platform.OS === "web") {
              const confirmLogout = window.confirm("Are you sure you want to log out?");
              if (confirmLogout) {
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Login" }],
                });
              }
            } else {
              Alert.alert(
                "Logout",
                "Are you sure you want to log out?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Logout",
                    style: "destructive",
                    onPress: () => {
                      navigation.reset({
                        index: 0,
                        routes: [{ name: "Login" }],
                      });
                    },
                  },
                ]
              );
            }
          }}
          style={{ paddingHorizontal: 10 }}
        >
          <Feather name="log-out" size={20} color="#FFFFFF" />
        </Pressable>
      ),
    });
  }, [navigation]);

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

  const getMonthlyData = () => {
    const monthly = {};

    transactions.forEach((item) => {
      if (item.type === "expense") {
        const month = new Date(item.date).toLocaleString("default", {
          month: "short",
        });

        monthly[month] =
          (monthly[month] || 0) + Number(item.amount);
      }
    });

    const labels = Object.keys(monthly);
    const data = Object.values(monthly);

    return {
      labels,
      datasets: [
        {
          data: data.length > 0 ? data : [0],
        },
      ],
    };
  };

  const getTotals = () => {
    let totalExpense = 0;
    let totalIncome = 0;

    transactions.forEach((item) => {
      if (item.type === "expense") {
        totalExpense += Number(item.amount);
      } else {
        totalIncome += Number(item.amount);
      }
    });

    return { totalExpense, totalIncome };
  };

  const { totalExpense, totalIncome } = getTotals();

  const getTopCategory = () => {
    const data = {};

    transactions.forEach((item) => {
      if (item.type === "expense") {
        data[item.category] =
          (data[item.category] || 0) + Number(item.amount);
      }
    });

    const categories = Object.keys(data);

    if (categories.length === 0) return null;

    let top = categories[0];

    categories.forEach((cat) => {
      if (data[cat] > data[top]) {
        top = cat;
      }
    });

    return top;
  };

  const getMonthlyComparison = () => {
    const monthly = {};

    transactions.forEach((item) => {
      if (item.type === "expense") {
        const month = new Date(item.date).getMonth();

        monthly[month] =
          (monthly[month] || 0) + Number(item.amount);
      }
    });

    const months = Object.keys(monthly).sort();

    if (months.length < 2) return null;

    const last = monthly[months[months.length - 1]];
    const prev = monthly[months[months.length - 2]];

    if (last > prev) {
      return "Spending increased this month 📈";
    } else {
      return "Spending decreased this month 📉";
    }
  };

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

  const renderCharts = () => {
    const isWebOrWide = Platform.OS === "web" || screenWidth > 768;
    const halfChartWidth = isWebOrWide
      ? Math.min((screenWidth - spacing.md * 4) / 2 - 10, 500)
      : screenWidth - spacing.md * 2;

    const monthlyData = getMonthlyData();

    return (
      <View style={styles.chartsRow}>
        {/* Left Side: Expense breakdown */}
        <View style={styles.chartCol}>
          <Text style={styles.sectionTitle}>Expense breakdown</Text>
          {chartData.length > 0 ? (
            <View style={styles.chartWrap}>
              <PieChart
                data={chartData}
                width={halfChartWidth}
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

        {/* Right Side: Monthly Spending Trend */}
        <View style={styles.chartCol}>
          <Text style={styles.sectionTitle}>Monthly Spending Trend</Text>
          {transactions.length > 0 && monthlyData.labels.length > 0 ? (
            <View style={styles.chartWrap}>
              <LineChart
                data={monthlyData}
                width={halfChartWidth}
                height={220}
                chartConfig={{
                  backgroundColor: colors.surface,
                  backgroundGradientFrom: colors.surface,
                  backgroundGradientTo: colors.surface,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(15, 118, 110, ${opacity})`,
                  labelColor: (opacity = 1) => colors.text,
                }}
                style={{ borderRadius: radii.md }}
              />
            </View>
          ) : (
            <Text style={styles.emptyChart}>
              No monthly expense data to display.
            </Text>
          )}
        </View>
      </View>
    );
  };

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
        
        <View style={{ marginVertical: 15 }}>
          <Text style={{ fontSize: 18, color: colors.text, fontWeight: "600" }}>
            Total Expense: Rs. {totalExpense.toFixed(2)}
          </Text>
          <Text style={{ fontSize: 18, color: colors.text, fontWeight: "600" }}>
            Total Income: Rs. {totalIncome.toFixed(2)}
          </Text>
        </View>

        {/* Insight Card */}
        <View style={{ marginVertical: 10, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textMuted }}>
            🔍 Insight:
          </Text>

          <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary, marginTop: 5 }}>
            {getTopCategory()
              ? `You spent most on ${getTopCategory()}`
              : "No data available"}
          </Text>

          {getMonthlyComparison() ? (
            <Text style={{ fontSize: 16, marginTop: 8, color: colors.text, fontWeight: "500" }}>
              {getMonthlyComparison()}
            </Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Transactions</Text>
        {renderTransactionsList()}
        {renderCharts()}
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
  chartsRow: {
    flexDirection: Platform.OS === "web" || Dimensions.get("window").width > 768 ? "row" : "column",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  chartCol: {
    flex: 1,
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
