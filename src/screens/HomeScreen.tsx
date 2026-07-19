import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import moment from "moment";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import QuoteCard from "../components/QuoteCard";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  DashboardData,
  MaturityItem,
  PaymentDueItem,
  WorthSegment,
  useDashboard,
} from "../hooks/useDashboard";
import { ModuleKey } from "../models/common";
import { ThemeColors, tint } from "../utils/Color";
import { DATE_FORMAT } from "../utils/deposits";
import { amountFormat } from "../utils/Utils";

type GreetingIcon = React.ComponentProps<
  typeof MaterialCommunityIcons
>["name"];

const greetingForHour = (
  hour: number
): { text: string; icon: GreetingIcon; color: string } => {
  const text =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  // The icon tracks the actual sky and is finer-grained than the three
  // greetings, so early evening shows a setting sun rather than a moon that
  // isn't out yet, and the small hours show a moon under "Good morning".
  if (hour >= 5 && hour < 8)
    return { text, icon: "weather-sunset-up", color: "#F59E0B" }; // dawn
  if (hour >= 8 && hour < 17)
    return { text, icon: "weather-sunny", color: "#FBBF24" }; // full sun
  if (hour >= 17 && hour < 20)
    return { text, icon: "weather-sunset-down", color: "#F97316" }; // dusk
  return { text, icon: "weather-night", color: "#8B95E8" }; // night
};

const rupees = (value: number) => `₹ ${amountFormat(Math.round(value))}`;

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type ModuleMeta = { label: string; icon: IconName; accent: keyof ThemeColors };
const MODULES: Record<ModuleKey, ModuleMeta> = {
  deposits: { label: "Deposits", icon: "card-outline", accent: "accentBlue" },
  documents: {
    label: "Documents",
    icon: "document-text-outline",
    accent: "accentViolet",
  },
  assets: { label: "Assets", icon: "cube-outline", accent: "accentAmber" },
  ledger: { label: "Ledger", icon: "book-outline", accent: "accentBlue" },
  expenses: { label: "Expenses", icon: "receipt-outline", accent: "accentAmber" },
};
const MODULE_ORDER: ModuleKey[] = [
  "deposits",
  "documents",
  "assets",
  "ledger",
  "expenses",
];

const SEGMENT_ACCENT: Record<WorthSegment["key"], keyof ThemeColors> = {
  deposits: "accentBlue",
  savings: "positive",
  gold: "accentAmber",
  property: "accentViolet",
};

/** "matured" / "today" / "in 5d" / "3 Aug" — short, glanceable. */
const whenLabel = (date: string, daysUntil: number, pastWord: string) => {
  if (daysUntil < 0) return pastWord;
  if (daysUntil === 0) return "Today";
  if (daysUntil <= 21) return `in ${daysUntil}d`;
  const parsed = moment(date, DATE_FORMAT, true);
  return parsed.isValid() ? parsed.format("D MMM") : `in ${daysUntil}d`;
};

const HomeScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);
  const dashboard = useDashboard();

  const isAdmin = user?.role === "admin";
  const modules = MODULE_ORDER.filter(
    (key) => isAdmin || user?.moduleAccess?.includes(key)
  );
  const hasAnything =
    !!dashboard.worth || !!dashboard.attention || !!dashboard.month;

  // A family that hasn't added anything yet gets a warm nudge instead of a wall
  // of ₹0 cards. Once any record exists, the real dashboard takes over.
  const isFresh =
    dashboard.ready &&
    modules.length > 0 &&
    (dashboard.worth?.total ?? 0) === 0 &&
    (dashboard.attention?.maturities.length ?? 0) === 0 &&
    (dashboard.attention?.paymentsDue.length ?? 0) === 0 &&
    (dashboard.month?.expenses ?? 0) === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>{greeting.text}</Text>
          <MaterialCommunityIcons
            name={greeting.icon}
            size={20}
            color={greeting.color}
            style={styles.greetingIcon}
          />
        </View>
        {!!(user?.name || user?.username) && (
          <Text style={styles.name} numberOfLines={1}>
            {user?.name || user?.username}
          </Text>
        )}
      </View>

      <QuoteCard />

      {!dashboard.ready ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isFresh ? (
        <View style={styles.card}>
          <View style={[styles.attnIcon, { backgroundColor: tint(colors.primary) }]}>
            <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.freshTitle}>Your vault is ready</Text>
          <Text style={styles.freshBody}>
            Add your first deposit, asset or expense and this page fills in with
            your family&rsquo;s worth, upcoming dates and monthly spending.
          </Text>
        </View>
      ) : (
        <>
          {dashboard.worth && (
            <WorthCard
              worth={dashboard.worth}
              colors={colors}
              styles={styles}
              onOpen={(href) => router.push(href as never)}
            />
          )}

          {dashboard.attention && (
            <AttentionCard
              attention={dashboard.attention}
              colors={colors}
              styles={styles}
            />
          )}

          {dashboard.month && (
            <MonthCard month={dashboard.month} colors={colors} styles={styles} />
          )}

          {!hasAnything && modules.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons
                name="lock-closed-outline"
                size={22}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>
                No modules assigned yet. Ask your family admin to grant access.
              </Text>
            </View>
          )}
        </>
      )}

      {modules.length > 0 && (
        <>
          <Text style={styles.quickTitle}>Quick access</Text>
          <View style={styles.quickRow}>
            {modules.map((key) => {
              const meta = MODULES[key];
              const accent = colors[meta.accent] as string;
              return (
                <Pressable
                  key={key}
                  onPress={() => router.push(`/${key}` as never)}
                  accessibilityRole="button"
                  accessibilityLabel={meta.label}
                  style={({ pressed }) => [
                    styles.quickChip,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[styles.quickIcon, { backgroundColor: tint(accent) }]}
                  >
                    <Ionicons name={meta.icon} size={20} color={accent} />
                  </View>
                  <Text style={styles.quickLabel} numberOfLines={1}>
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
            {isAdmin && (
              <Pressable
                onPress={() => router.push("/admin")}
                accessibilityRole="button"
                accessibilityLabel="Family Admin"
                style={({ pressed }) => [
                  styles.quickChip,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.quickIcon,
                    { backgroundColor: tint(colors.accentViolet) },
                  ]}
                >
                  <Ionicons
                    name="shield-outline"
                    size={20}
                    color={colors.accentViolet}
                  />
                </View>
                <Text style={styles.quickLabel} numberOfLines={1}>
                  Admin
                </Text>
              </Pressable>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
};

/* ------------------------------------------------------------------ *
 * Sections
 * ------------------------------------------------------------------ */

type SectionProps = {
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
};

const WorthCard = ({
  worth,
  colors,
  styles,
  onOpen,
}: SectionProps & {
  worth: NonNullable<DashboardData["worth"]>;
  onOpen: (href: string) => void;
}) => {
  const priced = worth.segments.filter((s) => s.value > 0);
  const barTotal = priced.reduce((sum, s) => sum + s.value, 0);

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Total worth</Text>
      <Text style={styles.worthValue}>{rupees(worth.total)}</Text>

      {barTotal > 0 && (
        <View style={styles.worthBar}>
          {priced.map((segment) => (
            <View
              key={segment.key}
              style={{
                flex: segment.value / barTotal,
                backgroundColor: colors[SEGMENT_ACCENT[segment.key]] as string,
              }}
            />
          ))}
        </View>
      )}

      <View style={styles.chipWrap}>
        {worth.segments.map((segment) => (
          <Pressable
            key={segment.key}
            onPress={() => onOpen(segment.href)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          >
            <View
              style={[
                styles.chipDot,
                {
                  backgroundColor: colors[
                    SEGMENT_ACCENT[segment.key]
                  ] as string,
                },
              ]}
            />
            <Text style={styles.chipLabel}>{segment.label}</Text>
            <Text style={styles.chipValue}>{rupees(segment.value)}</Text>
          </Pressable>
        ))}
      </View>

      {worth.needsRates && (
        <Pressable
          onPress={() => onOpen("/assets/overview")}
          accessibilityRole="button"
          style={({ pressed }) => [styles.nudge, pressed && styles.pressed]}
        >
          <Ionicons name="pricetag-outline" size={15} color={colors.primary} />
          <Text style={styles.nudgeText}>
            {worth.unpricedGrams > 0
              ? `Set metal rates to value ${Math.round(
                  worth.unpricedGrams
                )} g of gold`
              : "Set metal rates to value your gold"}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const AttentionCard = ({
  attention,
  colors,
  styles,
}: SectionProps & { attention: NonNullable<DashboardData["attention"]> }) => {
  const { maturities, paymentsDue } = attention;
  const empty = maturities.length === 0 && paymentsDue.length === 0;

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Needs attention</Text>

      {empty ? (
        <View style={styles.clearRow}>
          <Ionicons
            name="checkmark-circle-outline"
            size={20}
            color={colors.positive}
          />
          <Text style={styles.clearText}>You&rsquo;re all caught up.</Text>
        </View>
      ) : (
        <>
          {maturities.slice(0, 4).map((item: MaturityItem) => (
            <View key={`m-${item.id}`} style={styles.attnRow}>
              <View
                style={[
                  styles.attnIcon,
                  { backgroundColor: tint(colors.accentBlue) },
                ]}
              >
                <Ionicons name="cash-outline" size={16} color={colors.accentBlue} />
              </View>
              <View style={styles.attnText}>
                <Text style={styles.attnTitle} numberOfLines={1}>
                  FD at {item.bankName}
                </Text>
                <Text style={styles.attnMeta}>
                  {item.daysUntil < 0 ? "Matured" : "Matures"}{" "}
                  {whenLabel(item.date, item.daysUntil, "· overdue")}
                </Text>
              </View>
              <Text style={styles.attnAmount}>{rupees(item.amount)}</Text>
            </View>
          ))}

          {paymentsDue.slice(0, 4).map((item: PaymentDueItem, index) => (
            <View key={`p-${item.propertyId}-${index}`} style={styles.attnRow}>
              <View
                style={[
                  styles.attnIcon,
                  {
                    backgroundColor: tint(
                      item.overdue ? colors.negative : colors.accentViolet
                    ),
                  },
                ]}
              >
                <Ionicons
                  name="home-outline"
                  size={16}
                  color={item.overdue ? colors.negative : colors.accentViolet}
                />
              </View>
              <View style={styles.attnText}>
                <Text style={styles.attnTitle} numberOfLines={1}>
                  {item.propertyName} · {item.label}
                </Text>
                <Text
                  style={[styles.attnMeta, item.overdue && styles.attnOverdue]}
                >
                  {item.overdue ? "Overdue" : "Due"}{" "}
                  {moment(item.date, DATE_FORMAT, true).isValid()
                    ? moment(item.date, DATE_FORMAT).format("D MMM")
                    : ""}
                </Text>
              </View>
              <Text style={styles.attnAmount}>{rupees(item.amount)}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
};

const MonthCard = ({
  month,
  colors,
  styles,
}: SectionProps & { month: NonNullable<DashboardData["month"]> }) => {
  const delta = month.expenses - month.lastMonthExpenses;
  const pct =
    month.lastMonthExpenses > 0
      ? Math.round((delta / month.lastMonthExpenses) * 100)
      : null;
  const max = Math.max(...month.sparkline.map((m) => m.value), 1);

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>This month</Text>

      <View style={styles.monthTop}>
        <View>
          <Text style={styles.worthValue}>{rupees(month.expenses)}</Text>
          <Text style={styles.monthCaption}>spent</Text>
        </View>
        {month.earnings !== null && (
          <View style={styles.monthEarned}>
            <Text style={styles.monthEarnedValue}>{rupees(month.earnings)}</Text>
            <Text style={styles.monthCaption}>earned</Text>
          </View>
        )}
      </View>

      {pct !== null && (
        <View style={styles.deltaRow}>
          <Ionicons
            name={delta > 0 ? "arrow-up" : "arrow-down"}
            size={14}
            color={delta > 0 ? colors.negative : colors.positive}
          />
          <Text
            style={[
              styles.deltaText,
              { color: delta > 0 ? colors.negative : colors.positive },
            ]}
          >
            {Math.abs(pct)}% vs last month
          </Text>
        </View>
      )}

      <View style={styles.spark}>
        {month.sparkline.map((bar, index) => (
          <View key={bar.label + index} style={styles.sparkCol}>
            <View style={styles.sparkTrack}>
              <View
                style={[
                  styles.sparkFill,
                  {
                    height: `${Math.max((bar.value / max) * 100, 2)}%`,
                    backgroundColor:
                      index === month.sparkline.length - 1
                        ? colors.primary
                        : tint(colors.primary),
                  },
                ]}
              />
            </View>
            <Text style={styles.sparkLabel}>{bar.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 32 },
    header: { marginTop: 8, marginBottom: 20 },
    greetingRow: { flexDirection: "row", alignItems: "center" },
    greetingIcon: { marginLeft: 6 },
    greeting: { fontSize: 15, color: colors.textMuted },
    name: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
      marginTop: 2,
      textTransform: "capitalize",
    },
    loading: { paddingVertical: 48, alignItems: "center" },
    pressed: { opacity: 0.6 },

    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 18,
      marginTop: 16,
    },
    cardLabel: {
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: colors.textMuted,
      marginBottom: 10,
    },

    // Worth
    worthValue: {
      fontSize: 30,
      fontWeight: "700",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    worthBar: {
      flexDirection: "row",
      height: 8,
      borderRadius: 4,
      overflow: "hidden",
      marginTop: 16,
      backgroundColor: colors.inputBackground,
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 14,
      gap: 8,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: colors.inputBackground,
    },
    chipDot: { width: 8, height: 8, borderRadius: 4 },
    chipLabel: { fontSize: 13, color: colors.textMuted },
    chipValue: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    nudge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 14,
    },
    nudgeText: { fontSize: 13, color: colors.primary, flex: 1 },

    // Attention
    clearRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    clearText: { fontSize: 14, color: colors.textMuted },
    attnRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
    },
    attnIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    attnText: { flex: 1 },
    attnTitle: { fontSize: 15, color: colors.text, fontWeight: "500" },
    attnMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    attnOverdue: { color: colors.negative, fontWeight: "600" },
    attnAmount: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },

    // Month
    monthTop: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },
    monthEarned: { alignItems: "flex-end" },
    monthEarnedValue: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.positive,
      fontVariant: ["tabular-nums"],
    },
    monthCaption: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    deltaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 10,
    },
    deltaText: { fontSize: 13, fontWeight: "600" },
    spark: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      height: 64,
      marginTop: 16,
    },
    sparkCol: { flex: 1, alignItems: "center" },
    sparkTrack: {
      width: "100%",
      height: 48,
      justifyContent: "flex-end",
      borderRadius: 6,
      overflow: "hidden",
      backgroundColor: colors.inputBackground,
    },
    sparkFill: { width: "100%", borderRadius: 6 },
    sparkLabel: { fontSize: 10, color: colors.textMuted, marginTop: 6 },

    // Quick access
    quickTitle: {
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: colors.textMuted,
      marginTop: 28,
      marginBottom: 12,
    },
    quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    quickChip: {
      alignItems: "center",
      gap: 6,
      width: 72,
    },
    quickIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    quickLabel: { fontSize: 12, color: colors.text },

    freshTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginTop: 12,
    },
    freshBody: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 21,
      marginTop: 6,
    },
    emptyCard: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 24,
      marginTop: 16,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 10,
      lineHeight: 20,
    },
  });

export default HomeScreen;
