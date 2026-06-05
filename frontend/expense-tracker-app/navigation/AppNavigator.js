import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import DashboardScreen from "../screens/DashboardScreen";
import AddTransactionScreen from "../screens/AddTransactionScreen";
import EditTransactionScreen from "../screens/EditTransactionScreen";
import ChatbotScreen from "../screens/ChatbotScreen";
import ReceiptScannerScreen from "../screens/ReceiptScannerScreen";
import { colors } from "../constants/layout";

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: "#FFFFFF",
  headerTitleStyle: { fontWeight: "700", fontSize: 18 },
  contentStyle: { backgroundColor: colors.background },
};

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: "Create account" }}
      />
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: "Expense Tracker" }}
      />
      <Stack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{ title: "Add transaction" }}
      />
      <Stack.Screen
        name="EditTransaction"
        component={EditTransactionScreen}
        options={{ title: "Edit transaction" }}
      />
      <Stack.Screen
        name="Chatbot"
        component={ChatbotScreen}
        options={{ title: "Smart Assistant" }}
      />
      <Stack.Screen
        name="ReceiptScanner"
        component={ReceiptScannerScreen}
        options={{
          title: "Scan Receipt",
          headerStyle: { backgroundColor: "#000000" },
          headerTintColor: "#FFFFFF",
        }}
      />
    </Stack.Navigator>
  );
}
