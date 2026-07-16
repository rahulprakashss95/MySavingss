import { ActivityIndicator, View } from "react-native";
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
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
import OverviewScreen from "./src/screens/OverviewScreen";
import ClientScreen from "./src/screens/ClientScreen";
import ClientAddEditScreen from "./src/screens/ClientAddEditScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import MenuButton from "./src/components/MenuButton";
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
  Clients: undefined;
  ClientAddEdit: any;
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
  OverView: undefined;
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
            // The hamburger lives on the right so it never collides with the
            // stack's automatic back button on pushed screens.
            <Stack.Group
              screenOptions={{ headerRight: () => <MenuButton /> }}
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
                name="Clients"
                component={ClientScreen}
                options={{ title: "Clients" }}
              />
              <Stack.Screen
                name="ClientAddEdit"
                component={ClientAddEditScreen}
                options={{ title: "Client" }}
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
                name="OverView"
                component={OverviewScreen}
                options={{ title: "Overview" }}
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

      {/* App-wide overlay: only meaningful once signed in. */}
      {user != null && <SideDrawer />}
    </View>
  );
};

const App = () => {
  return (
    <StoreProvider store={store}>
      <ThemeProvider>
        <AuthProvider>
          <DrawerProvider>
            <RootNavigator />
          </DrawerProvider>
        </AuthProvider>
      </ThemeProvider>
    </StoreProvider>
  );
};

export default App;
