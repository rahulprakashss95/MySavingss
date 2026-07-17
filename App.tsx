import { ActivityIndicator, View } from "react-native";
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { Provider as StoreProvider } from "react-redux";

import { store } from "./src/redux/store";

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import RecoverFamilyScreen from "./src/screens/RecoverFamilyScreen";
import AdminScreen from "./src/screens/AdminScreen";
import HomeScreen from "./src/screens/HomeScreen";
import DepositScreen from "./src/screens/DepositScreen";
import FixedDepositListScreen from "./src/screens/FixedDepositListScreen";
import FixedDepositAddEditScreen from "./src/screens/FixedDepositAddEditScreen";
import DocumentScreen from "./src/screens/DocumentScreen";
import GovernmentDocumentListScreen from "./src/screens/GovernmentDocumentListScreen";
import GovernmentDocumentAddEditScreen from "./src/screens/GovernmentDocumentAddEditScreen";
import BankDocumentListScreen from "./src/screens/BankDocumentListScreen";
import BankDocumentAddEditScreen from "./src/screens/BankDocumentAddEditScreen";
import AssetScreen from "./src/screens/AssetScreen";
import AssetOverviewScreen from "./src/screens/AssetOverviewScreen";
import OrnamentListScreen from "./src/screens/OrnamentListScreen";
import OrnamentAddEditScreen from "./src/screens/OrnamentAddEditScreen";
import PropertyListScreen from "./src/screens/PropertyListScreen";
import PropertyAddEditScreen from "./src/screens/PropertyAddEditScreen";
import PropertyPaymentsScreen from "./src/screens/PropertyPaymentsScreen";
import LedgerScreen from "./src/screens/LedgerScreen";
import LedgerClientListScreen from "./src/screens/LedgerClientListScreen";
import LedgerClientAddEditScreen from "./src/screens/LedgerClientAddEditScreen";
import EarningListScreen from "./src/screens/EarningListScreen";
import EarningAddEditScreen from "./src/screens/EarningAddEditScreen";
import SavingListScreen from "./src/screens/SavingListScreen";
import SavingAddEditScreen from "./src/screens/SavingAddEditScreen";
import LedgerOverviewScreen from "./src/screens/LedgerOverviewScreen";
import ExpenseScreen from "./src/screens/ExpenseScreen";
import ExpenseListScreen from "./src/screens/ExpenseListScreen";
import ExpenseAddEditScreen from "./src/screens/ExpenseAddEditScreen";
import ExpenseTypeListScreen from "./src/screens/ExpenseTypeListScreen";
import ExpenseTypeAddEditScreen from "./src/screens/ExpenseTypeAddEditScreen";
import ExpenseOverviewScreen from "./src/screens/ExpenseOverviewScreen";
import OverviewScreen from "./src/screens/OverviewScreen";
import BankScreen from "./src/screens/BankScreen";
import BankAddEditScreen from "./src/screens/BankAddEditScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import BottomTabBar from "./src/components/BottomTabBar";
import MenuButton from "./src/components/MenuButton";
import ProfileButton from "./src/components/ProfileButton";
import SideDrawer from "./src/components/SideDrawer";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { DrawerProvider } from "./src/context/DrawerContext";
import { navigationRef } from "./src/navigation/navigationRef";
import { themeVars } from "./src/utils/themeVars";
import { installWebStyles } from "./src/utils/webStyles";
import "./global.css";

// Remove the browser's default focus outline from web inputs, app-wide.
installWebStyles();

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  RecoverFamily: undefined;
  Admin: undefined;
  Home: undefined;
  Deposit: undefined;
  Banks: undefined;
  BankAddEdit: any;
  FixedDepositList: undefined;
  FixedDepositAddEdit: any;
  Documents: undefined;
  GovernmentDocumentList: undefined;
  GovernmentDocumentAddEdit: any;
  BankDocumentList: undefined;
  BankDocumentAddEdit: any;
  Assets: undefined;
  OrnamentList: undefined;
  OrnamentAddEdit: any;
  PropertyList: undefined;
  PropertyAddEdit: any;
  PropertyPayments: any;
  AssetOverview: undefined;
  Ledger: undefined;
  LedgerClientList: undefined;
  LedgerClientAddEdit: any;
  EarningList: undefined;
  EarningAddEdit: any;
  SavingList: undefined;
  SavingAddEdit: any;
  LedgerOverview: undefined;
  Expenses: undefined;
  ExpenseList: undefined;
  ExpenseAddEdit: any;
  ExpenseTypeList: undefined;
  ExpenseTypeAddEdit: any;
  ExpenseOverview: undefined;
  OverView: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { user, isRestoring } = useAuth();
  const { colors, isDark } = useTheme();

  const navigationTheme = {
    ...(isDark ? NavigationDarkTheme : NavigationDefaultTheme),
    colors: {
      ...(isDark ? NavigationDarkTheme : NavigationDefaultTheme).colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  };

  // Wait for the persisted session before deciding which stack to show,
  // otherwise the login screen flashes on every cold start.
  if (isRestoring) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    // themeVars publishes the active palette as CSS variables so NativeWind
    // classes (bg-background, text-text, …) track the same light/dark toggle.
    <View style={[{ flex: 1 }, themeVars(colors)]}>
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          {user == null ? (
            <Stack.Group screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen
                name="RecoverFamily"
                component={RecoverFamilyScreen}
              />
            </Stack.Group>
          ) : (
            // The hamburger sits on the left, matching the side the drawer
            // slides in from. On a pushed screen the back button owns that slot
            // and wins — so the drawer is reached from the top level, as it is
            // in most apps that have one. `canGoBack` is what distinguishes the
            // two: it is only false for the stack's first route.
            <Stack.Group
              screenOptions={({ navigation, route }) => ({
                headerLeft: navigation.canGoBack()
                  ? undefined
                  : () => <MenuButton />,
                // The right slot is free on every screen — the back button only
                // ever takes the left — so the avatar is one tap away app-wide.
                // Except on Profile itself, where it would push a second copy.
                headerRight:
                  route.name === "Profile" ? undefined : () => <ProfileButton />,
              })}
            >
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: "Home" }}
              />
              <Stack.Screen
                name="Deposit"
                component={DepositScreen}
                options={{ title: "Deposits" }}
              />
              <Stack.Screen
                name="Banks"
                component={BankScreen}
                options={{ title: "Banks" }}
              />
              <Stack.Screen
                name="BankAddEdit"
                component={BankAddEditScreen}
                options={{ title: "Bank" }}
              />
              <Stack.Screen
                name="FixedDepositList"
                component={FixedDepositListScreen}
                options={{ title: "Fixed Deposits" }}
              />
              <Stack.Screen
                name="FixedDepositAddEdit"
                component={FixedDepositAddEditScreen}
                options={{ title: "Fixed Deposit" }}
              />
              <Stack.Screen
                name="Documents"
                component={DocumentScreen}
                options={{ title: "Documents" }}
              />
              <Stack.Screen
                name="GovernmentDocumentList"
                component={GovernmentDocumentListScreen}
                options={{ title: "Government" }}
              />
              <Stack.Screen
                name="GovernmentDocumentAddEdit"
                component={GovernmentDocumentAddEditScreen}
                options={{ title: "Government Document" }}
              />
              <Stack.Screen
                name="BankDocumentList"
                component={BankDocumentListScreen}
                options={{ title: "Bank" }}
              />
              <Stack.Screen
                name="BankDocumentAddEdit"
                component={BankDocumentAddEditScreen}
                options={{ title: "Bank Account" }}
              />
              <Stack.Screen
                name="Assets"
                component={AssetScreen}
                options={{ title: "Assets" }}
              />
              <Stack.Screen
                name="OrnamentList"
                component={OrnamentListScreen}
                options={{ title: "Ornaments" }}
              />
              <Stack.Screen
                name="OrnamentAddEdit"
                component={OrnamentAddEditScreen}
                options={{ title: "Ornament" }}
              />
              <Stack.Screen
                name="PropertyList"
                component={PropertyListScreen}
                options={{ title: "Properties" }}
              />
              <Stack.Screen
                name="PropertyAddEdit"
                component={PropertyAddEditScreen}
                options={{ title: "Property" }}
              />
              <Stack.Screen
                name="PropertyPayments"
                component={PropertyPaymentsScreen}
                options={{ title: "Payments" }}
              />
              <Stack.Screen
                name="AssetOverview"
                component={AssetOverviewScreen}
                options={{ title: "Asset Overview" }}
              />
              <Stack.Screen
                name="Ledger"
                component={LedgerScreen}
                options={{ title: "Ledger" }}
              />
              <Stack.Screen
                name="LedgerClientList"
                component={LedgerClientListScreen}
                options={{ title: "Clients" }}
              />
              <Stack.Screen
                name="LedgerClientAddEdit"
                component={LedgerClientAddEditScreen}
                options={{ title: "Client" }}
              />
              <Stack.Screen
                name="EarningList"
                component={EarningListScreen}
                options={{ title: "Earnings" }}
              />
              <Stack.Screen
                name="EarningAddEdit"
                component={EarningAddEditScreen}
                options={{ title: "Earning" }}
              />
              <Stack.Screen
                name="SavingList"
                component={SavingListScreen}
                options={{ title: "Savings" }}
              />
              <Stack.Screen
                name="SavingAddEdit"
                component={SavingAddEditScreen}
                options={{ title: "Saving" }}
              />
              <Stack.Screen
                name="LedgerOverview"
                component={LedgerOverviewScreen}
                options={{ title: "Ledger Overview" }}
              />
              <Stack.Screen
                name="Expenses"
                component={ExpenseScreen}
                options={{ title: "Expenses" }}
              />
              <Stack.Screen
                name="ExpenseList"
                component={ExpenseListScreen}
                options={{ title: "Expenses" }}
              />
              <Stack.Screen
                name="ExpenseAddEdit"
                component={ExpenseAddEditScreen}
                options={{ title: "Expense" }}
              />
              <Stack.Screen
                name="ExpenseTypeList"
                component={ExpenseTypeListScreen}
                options={{ title: "Expense Types" }}
              />
              <Stack.Screen
                name="ExpenseTypeAddEdit"
                component={ExpenseTypeAddEditScreen}
                options={{ title: "Expense Type" }}
              />
              <Stack.Screen
                name="ExpenseOverview"
                component={ExpenseOverviewScreen}
                options={{ title: "Expense Overview" }}
              />
              <Stack.Screen
                name="OverView"
                component={OverviewScreen}
                options={{ title: "Overview" }}
              />
              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ title: "Profile" }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: "Settings" }}
              />
              <Stack.Screen
                name="Admin"
                component={AdminScreen}
                options={{ title: "Family Admin" }}
              />
            </Stack.Group>
          )}
        </Stack.Navigator>
        <Toast />
      </NavigationContainer>

      {/* A sibling of the navigator, not an overlay: it occupies real layout
          space, so screens scroll to just above it instead of underneath. */}
      {user != null && <BottomTabBar />}

      {/* App-wide overlay: only meaningful once signed in. Last, so the drawer
          covers the tab bar rather than sliding in beside it. */}
      {user != null && <SideDrawer />}
    </View>
  );
};

const App = () => {
  return (
    // The stack provides safe-area context to its own screens, but BottomTabBar
    // sits outside the navigator and still has to clear the home indicator and
    // the gesture bar — so the provider has to be above both.
    <SafeAreaProvider>
      <StoreProvider store={store}>
        <ThemeProvider>
          <AuthProvider>
            <DrawerProvider>
              <RootNavigator />
            </DrawerProvider>
          </AuthProvider>
        </ThemeProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
};

export default App;
