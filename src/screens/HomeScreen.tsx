import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import moment from "moment";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import QuoteCard from "../components/QuoteCard";
import { DashboardSkeleton } from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import {
  DashboardSection,
  useDashboardLayoutStore,
} from "../context/DashboardLayoutContext";
import { useTheme } from "../context/ThemeContext";
import {
  DashboardData,
  MaturityItem,
  MonthFlow,
  PaymentDueItem,
  WorthSegment,
  useDashboard,
} from "../hooks/useDashboard";
import { canSeeModule, ModuleKey } from "../models/common";
import { QuickAccessItem, resolveQuickAccess } from "../models/quickAccess";
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

/**
 * `amountFormat` renders 0 as an empty string and puts a negative sign inside
 * the grouping, so both are handled here — a dashboard shows "₹ 0", never "₹ ",
 * and a negative net reads "-₹ 4,200" rather than "₹ -4,200".
 */
const rupees = (value: number) => {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}₹ ${amountFormat(Math.abs(rounded)) || "0"}`;
};

/** Plot height of the month sparkline; the average line is placed against it. */
const SPARK_TRACK = 52;

/**
 * Only used to decide whether the member has any module at all — the shortcut
 * chips themselves come from the Quick access catalogue now.
 */
const MODULE_ORDER: ModuleKey[] = ["documents", "assets", "ledger"];

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

  const order = useDashboardLayoutStore((state) => state.order);
  const quick = useDashboardLayoutStore((state) => state.quick);
  const quickItems = useMemo(
    () => resolveQuickAccess(quick, user),
    [quick, user]
  );

  const modules = MODULE_ORDER.filter((key) => canSeeModule(user, key));

  /**
   * Every link on this screen lands in another tab's stack, which is what makes
   * `withAnchor` non-optional: without it expo-router marks the incoming screen
   * as that stack's initial route, so it arrives with nothing beneath it and no
   * back button (`getNavigationAction` sets `initial: !withAnchor`). With it,
   * the stack's anchor — `index`, declared in each module's `_layout` — is
   * pushed underneath first. Both halves are required; either alone does
   * nothing.
   */
  const open = (href: string) => router.push(href as never, { withAnchor: true });
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
    (dashboard.month?.expenses?.total ?? 0) === 0 &&
    (dashboard.month?.earnings?.total ?? 0) === 0;

  // The cards only have something to say once loading has finished and the
  // family has records.
  const showData = dashboard.ready && !isFresh;

  /**
   * Which placeholders the loading state draws. `worth`/`attention`/`month` are
   * non-null from the first render — what they contain waits on the fetch, but
   * *whether the member has them at all* comes from their access — so the
   * skeleton shows exactly the sections that are about to arrive, in the
   * member's own order.
   */
  const pendingSections = order.filter((key) =>
    key === "quick" ? modules.length > 0 : !!dashboard[key]
  );
  const sections: Record<DashboardSection, React.ReactNode> = {
    attention:
      showData && dashboard.attention ? (
        <AttentionCard
          attention={dashboard.attention}
          colors={colors}
          styles={styles}
        />
      ) : null,
    month:
      showData && dashboard.month ? (
        <MonthCard month={dashboard.month} colors={colors} styles={styles} />
      ) : null,
    worth:
      showData && dashboard.worth ? (
        <WorthCard
          worth={dashboard.worth}
          colors={colors}
          styles={styles}
          onOpen={open}
        />
      ) : null,
    // Shortcuts don't wait on the fetch, but they are drawn with everything
    // else: see `DashboardSkeleton`.
    quick:
      dashboard.ready && modules.length > 0 ? (
        <QuickAccess
          items={quickItems}
          colors={colors}
          styles={styles}
          onOpen={open}
        />
      ) : null,
  };

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

      {!dashboard.ready && (
        <DashboardSkeleton
          sections={pendingSections}
          // The trailing "Edit" chip is always drawn, so the row is one wider
          // than the member's selection.
          quickCount={quickItems.length + 1}
        />
      )}

      {isFresh && (
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
      )}

      {order.map((key) => (
        <React.Fragment key={key}>{sections[key]}</React.Fragment>
      ))}

      {showData && !hasAnything && modules.length === 0 && (
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

      <Pressable
        onPress={() => open("/settings/dashboard")}
        accessibilityRole="button"
        style={({ pressed }) => [styles.customise, pressed && styles.pressed]}
      >
        <Ionicons
          name="options-outline"
          size={15}
          color={colors.textMuted}
        />
        <Text style={styles.customiseText}>Customise dashboard</Text>
      </Pressable>
    </ScrollView>
  );
};

/**
 * The shortcut row. What it holds is the member's own selection (see
 * `quickAccess.ts`), so the trailing chip — which is the only affordance saying
 * the row can be changed at all — is always drawn, and stands in as the empty
 * state for someone who has removed every shortcut.
 */
const QuickAccess = ({
  items,
  colors,
  styles,
  onOpen,
}: SectionProps & {
  items: QuickAccessItem[];
  onOpen: (href: string) => void;
}) => (
  <>
    <Text style={styles.quickTitle}>Quick access</Text>
    <View style={styles.quickRow}>
      {items.map((item) => {
        const accent = colors[item.accent] as string;
        return (
          <Pressable
            key={item.id}
            onPress={() => onOpen(item.href)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={({ pressed }) => [styles.quickChip, pressed && styles.pressed]}
          >
            <View style={[styles.quickIcon, { backgroundColor: tint(accent) }]}>
              <Ionicons name={item.icon} size={20} color={accent} />
            </View>
            <Text style={styles.quickLabel} numberOfLines={2}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        onPress={() => onOpen("/settings/dashboard")}
        accessibilityRole="button"
        accessibilityLabel="Edit shortcuts"
        style={({ pressed }) => [styles.quickChip, pressed && styles.pressed]}
      >
        <View style={[styles.quickIcon, styles.quickIconAdd]}>
          <Ionicons name="add" size={22} color={colors.textMuted} />
        </View>
        <Text style={styles.quickLabel} numberOfLines={2}>
          Edit
        </Text>
      </Pressable>
    </View>
  </>
);

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

/**
 * Movement against the month before. The rupee figure leads and the percentage
 * follows in brackets: income is lumpy, and one extra invoice against a quiet
 * month reads as "+340%" — loud, and saying much less than the amount does.
 * `upIsGood` flips the colour, since earning more and spending more are not the
 * same news.
 */
const DeltaRow = ({
  current,
  previous,
  sinceLabel,
  upIsGood,
  compact,
  colors,
  styles,
}: SectionProps & {
  current: number;
  previous: number;
  sinceLabel: string;
  upIsGood: boolean;
  /** Percentage only — for the narrow footer columns, where the full phrase wraps. */
  compact?: boolean;
}) => {
  // Nothing to compare against: a percentage off zero is either 0 or infinite.
  if (previous <= 0) return null;

  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  const color =
    diff === 0
      ? colors.textMuted
      : diff > 0 === upIsGood
      ? colors.positive
      : colors.negative;

  const full =
    diff === 0
      ? `Same as ${sinceLabel}`
      : `${rupees(Math.abs(diff))} (${Math.abs(pct)}%) vs ${sinceLabel}`;

  return (
    <View style={[styles.deltaRow, compact && styles.deltaRowCompact]}>
      <Ionicons
        name={diff === 0 ? "remove" : diff > 0 ? "arrow-up" : "arrow-down"}
        size={compact ? 12 : 14}
        color={color}
      />
      <Text
        style={[styles.deltaText, compact && styles.deltaTextCompact, { color }]}
        numberOfLines={1}
      >
        {compact ? `${Math.abs(pct)}%` : full}
      </Text>
    </View>
  );
};

/**
 * Seven columns: six completed months plus the running one, with the six-month
 * average drawn across them as a reference line. The running column carries an
 * open-topped cap at its projected month-end total, so a month that is merely
 * young doesn't read as a month that is going badly.
 */
const Sparkline = ({
  flow,
  accent,
  colors,
  styles,
}: SectionProps & { flow: MonthFlow; accent: string }) => {
  const max = Math.max(
    ...flow.series.map((point) => point.total),
    flow.pace ?? 0,
    flow.average,
    1
  );
  const avgRatio = flow.average / max;

  return (
    <View style={styles.spark}>
      {flow.series.map((point, index) => {
        const isRunning = index === flow.series.length - 1;
        const fill = (point.total / max) * 100;
        const paceTop = isRunning && flow.pace ? (flow.pace / max) * 100 : 0;

        return (
          <View key={point.key} style={styles.sparkCol}>
            <View style={styles.sparkTrack}>
              {paceTop > fill && (
                <View
                  style={[
                    styles.sparkPace,
                    { height: `${paceTop - fill}%`, borderTopColor: accent },
                  ]}
                />
              )}
              <View
                style={[
                  styles.sparkFill,
                  {
                    height: `${Math.max(fill, 2)}%`,
                    backgroundColor: isRunning ? accent : tint(accent),
                  },
                ]}
              />
            </View>
            <Text
              style={[styles.sparkLabel, isRunning && styles.sparkLabelActive]}
              numberOfLines={1}
            >
              {point.label}
            </Text>
          </View>
        );
      })}

      {avgRatio > 0 && (
        <View
          pointerEvents="none"
          style={[styles.avgLine, { top: SPARK_TRACK * (1 - avgRatio) }]}
        />
      )}
    </View>
  );
};

const MonthCard = ({
  month,
  colors,
  styles,
}: SectionProps & { month: NonNullable<DashboardData["month"]> }) => {
  // Earnings lead when the member has them; the card falls back to expenses for
  // members who only hold that tile, which is how it read before.
  const hero = month.earnings ?? month.expenses;
  if (!hero) return null;

  const isEarnings = !!month.earnings;
  const accent = isEarnings ? colors.positive : colors.primary;
  const spend = isEarnings ? month.expenses : null;
  const net =
    month.earnings && month.expenses
      ? month.earnings.total - month.expenses.total
      : null;
  // Second from the end of the series — the last completed month.
  const previousLabel =
    hero.series[hero.series.length - 2]?.label ?? "last month";

  return (
    <View style={styles.card}>
      <View style={styles.monthHead}>
        <Text style={styles.cardLabel}>This month</Text>
        {!!month.fy && (
          <Text style={styles.fyText} numberOfLines={1}>
            {month.fy.label} · {rupees(month.fy.earned)}
          </Text>
        )}
      </View>

      <Text style={styles.worthValue}>{rupees(hero.total)}</Text>
      <Text style={styles.monthCaption}>{isEarnings ? "earned" : "spent"}</Text>

      <DeltaRow
        current={hero.total}
        previous={hero.previous}
        sinceLabel={previousLabel}
        upIsGood={isEarnings}
        colors={colors}
        styles={styles}
      />

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>6-mo avg {rupees(hero.average)}</Text>
        {hero.pace !== null && (
          <Text style={[styles.metaText, { color: accent }]} numberOfLines={1}>
            on pace for {rupees(hero.pace)}
          </Text>
        )}
      </View>

      <Sparkline flow={hero} accent={accent} colors={colors} styles={styles} />

      {(!!spend || net !== null) && (
        <View style={styles.footRow}>
          {!!spend && (
            <View style={styles.footStat}>
              <Text style={styles.footLabel}>Spent</Text>
              <Text style={styles.footValue}>{rupees(spend.total)}</Text>
              <DeltaRow
                current={spend.total}
                previous={spend.previous}
                sinceLabel={previousLabel}
                upIsGood={false}
                compact
                colors={colors}
                styles={styles}
              />
            </View>
          )}
          {net !== null && (
            <View style={styles.footStat}>
              <Text style={styles.footLabel}>Net</Text>
              <Text
                style={[
                  styles.footValue,
                  { color: net < 0 ? colors.negative : colors.text },
                ]}
              >
                {rupees(net)}
              </Text>
            </View>
          )}
        </View>
      )}
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
    monthHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    fyText: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 10,
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
    deltaRowCompact: { marginTop: 3, gap: 2 },
    deltaTextCompact: { fontSize: 12 },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginTop: 12,
    },
    metaText: {
      fontSize: 12,
      color: colors.textMuted,
      fontVariant: ["tabular-nums"],
    },
    spark: {
      flexDirection: "row",
      gap: 8,
      marginTop: 14,
    },
    sparkCol: { flex: 1, alignItems: "center" },
    sparkTrack: {
      width: "100%",
      height: SPARK_TRACK,
      justifyContent: "flex-end",
      borderRadius: 6,
      overflow: "hidden",
      backgroundColor: colors.inputBackground,
    },
    sparkFill: { width: "100%", borderRadius: 6 },
    // Open-topped: a cap at the projected total, not a second solid bar that
    // would read as money already earned.
    sparkPace: {
      width: "100%",
      borderTopWidth: 2,
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
    },
    avgLine: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 1,
      opacity: 0.55,
      backgroundColor: colors.textMuted,
    },
    sparkLabel: { fontSize: 10, color: colors.textMuted, marginTop: 6 },
    sparkLabelActive: { color: colors.text, fontWeight: "700" },
    footRow: {
      flexDirection: "row",
      gap: 16,
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    footStat: { flex: 1 },
    footLabel: { fontSize: 12, color: colors.textMuted },
    footValue: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginTop: 3,
      fontVariant: ["tabular-nums"],
    },

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
    quickIconAdd: {
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
    },
    // Two lines: shortcut labels are verbs now ("Add earning"), which no longer
    // fit a chip on one. A fixed height keeps one- and two-line chips aligned
    // when the row wraps.
    quickLabel: {
      fontSize: 12,
      color: colors.text,
      textAlign: "center",
      lineHeight: 15,
      height: 30,
    },

    customise: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 28,
      paddingVertical: 8,
    },
    customiseText: { fontSize: 13, color: colors.textMuted },

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
