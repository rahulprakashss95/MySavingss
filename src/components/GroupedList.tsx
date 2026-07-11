import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../utils/Color";
import { Section } from "../utils/grouping";
import { NavigationProp, showToast } from "../utils/Utils";
import type { RowPosition } from "./GroupedRow";
import FloatingButton from "./FAB";
import { GroupedListSkeleton } from "./Skeleton";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * Re-fetches on every focus, so a save on an add/edit screen shows the moment
 * we navigate back. Grouping is left to the caller: what a section means
 * differs per screen.
 */
export const useCollection = <T,>(
  fetcher: () => Promise<T[]>,
  navigation: NavigationProp,
  errorTitle: string
) => {
  const [items, setItems] = useState<T[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = () => {
    fetcher()
      .then((data) => setItems(data ?? []))
      .catch((error) => {
        console.log(error);
        showToast(
          "error",
          errorTitle,
          "Check your connection and pull down to retry.",
          "bottom"
        );
      })
      .finally(() => {
        setIsRefreshing(false);
        setHasLoaded(true);
      });
  };

  useEffect(() => navigation.addListener("focus", load), [navigation]);

  const onRefresh = () => {
    setIsRefreshing(true);
    load();
  };

  return { items, isRefreshing, hasLoaded, onRefresh };
};

type IGroupedList<T> = {
  sections: Section<T>[];
  isRefreshing: boolean;
  hasLoaded: boolean;
  onRefresh: () => void;
  onAdd: () => void;
  addLabel: string;
  /** Singular noun for each group's count, e.g. "document". */
  noun: string;
  /** Overrides the count on a section heading, e.g. with the month's total. */
  countLabel?: (section: Section<T>) => string;
  /** Hides section headings for a plain flat list — one already-scoped group. */
  hideSectionHeaders?: boolean;
  emptyIcon: IconName;
  emptyTitle: string;
  emptyBody: string;
  keyOf: (item: T) => string;
  renderItem: (item: T, position: RowPosition) => React.ReactElement;
};

const GroupedList = <T,>(props: IGroupedList<T>) => {
  const { sections, hasLoaded, noun } = props;
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const renderSectionHeader = (section: Section<T>) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle} numberOfLines={1}>
        {section.title}
      </Text>
      <Text style={styles.sectionCount}>
        {props.countLabel
          ? props.countLabel(section)
          : `${section.data.length} ${
              section.data.length === 1 ? noun : `${noun}s`
            }`}
      </Text>
    </View>
  );

  const renderEmpty = () => {
    // Never show "nothing here" before the first fetch has actually resolved.
    if (!hasLoaded) {
      return null;
    }
    return (
      <View style={styles.empty}>
        <Ionicons name={props.emptyIcon} size={44} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>{props.emptyTitle}</Text>
        <Text style={styles.emptyBody}>{props.emptyBody}</Text>
      </View>
    );
  };

  // Only the very first fetch gets a skeleton. Re-fetching on focus keeps the
  // list on screen rather than flashing placeholders over data we already have.
  if (!hasLoaded) {
    return (
      <View style={styles.container}>
        <View style={styles.listContent}>
          <GroupedListSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        contentContainerStyle={styles.listContent}
        sections={sections}
        keyExtractor={(item) => props.keyOf(item)}
        ListEmptyComponent={renderEmpty}
        renderSectionHeader={
          props.hideSectionHeaders
            ? undefined
            : ({ section }) => renderSectionHeader(section as Section<T>)
        }
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={props.isRefreshing}
            onRefresh={props.onRefresh}
            tintColor={colors.textMuted}
          />
        }
        renderItem={({ item, index, section }) =>
          props.renderItem(item, {
            isFirst: index === 0,
            isLast: index === section.data.length - 1,
          })
        }
      />
      <FloatingButton accessibilityLabel={props.addLabel} onPress={props.onAdd} />
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingTop: 16,
      paddingBottom: 90,
      flexGrow: 1,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginHorizontal: 20,
      marginBottom: 10,
    },
    sectionTitle: {
      flex: 1,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.7,
      color: colors.textMuted,
      marginRight: 12,
    },
    sectionCount: {
      fontSize: 12,
      color: colors.textMuted,
      fontVariant: ["tabular-nums"],
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
      paddingBottom: 60,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
      marginTop: 14,
    },
    emptyBody: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 6,
      lineHeight: 20,
    },
  });

export default GroupedList;
