import React, { useRef, useCallback } from 'react';
import { View, Text, Image, StyleSheet, Share, Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { scorePalette } from '../lib/sentimentColors';

// ─── Types ─────────────────────────────────────────────────────────────────────

type RankingItem = {
  name: string;
  score: number;
  sentiment: 'loved' | 'fine' | 'disliked';
  coverImage?: string | null;
};

type VisitItem = {
  restaurantName: string;
  score: number;
  note?: string | null;
  photoUrl?: string | null;
  dishes?: string[];
};

type ShareCardProps =
  | { type: 'ranking'; userName: string; items: RankingItem[]; userId: string }
  | { type: 'visit'; userName: string; visit: VisitItem; userId: string };

// ─── Hidden card for screenshot ────────────────────────────────────────────────

/**
 * Renders a branded card offscreen, captures it as an image, and shares it.
 * Usage:
 *   const shareRef = useRef<ShareCardHandle>(null);
 *   <ShareCard ref={shareRef} type="ranking" ... />
 *   shareRef.current?.share();
 */
export type ShareCardHandle = {
  share: () => Promise<void>;
};

export const ShareCard = React.forwardRef<ShareCardHandle, ShareCardProps>(
  function ShareCard(props, ref) {
    const viewRef = useRef<View>(null);

    const share = useCallback(async () => {
      if (!viewRef.current) return;

      try {
        const uri = await captureRef(viewRef, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
        });

        const deepLink = `https://savry.app/u/${props.userId}`;

        if (Platform.OS === 'web') {
          await Share.share({ message: `Mi ranking en savry ${deepLink}`, url: uri });
          return;
        }

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Compartir en savry',
            UTI: 'public.png',
          });
        } else {
          await Share.share({ message: `Mi ranking en savry ${deepLink}`, url: uri });
        }
      } catch (e) {
        // User cancelled share sheet — ignore
      }
    }, [props.userId]);

    React.useImperativeHandle(ref, () => ({ share }));

    if (props.type === 'ranking') {
      return (
        <View style={styles.offscreen} pointerEvents="none">
          <View ref={viewRef} style={styles.card} collapsable={false}>
            <View style={styles.header}>
              <Text style={styles.logo}>savry</Text>
              <Text style={styles.headerSub}>Ranking personal</Text>
            </View>
            <Text style={styles.userName}>{props.userName}</Text>
            <View style={styles.listContainer}>
              {props.items.slice(0, 5).map((item, i) => (
                <View key={i} style={styles.rankRow}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankNum}>{i + 1}</Text>
                  </View>
                  <Text style={styles.rankName} numberOfLines={1}>{item.name}</Text>
                  <View style={[styles.scoreBadge, { backgroundColor: scorePalette(item.score).badgeBg }]}>
                    <Text style={[styles.scoreText, { color: scorePalette(item.score).badgeText }]}>
                      {item.score.toFixed(1)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <Text style={styles.footer}>savry.app — Tu círculo gastronómico</Text>
          </View>
        </View>
      );
    }

    // Visit card
    const { visit } = props;
    return (
      <View style={styles.offscreen} pointerEvents="none">
        <View ref={viewRef} style={styles.card} collapsable={false}>
          <View style={styles.header}>
            <Text style={styles.logo}>savry</Text>
          </View>
          <Text style={styles.userName}>{props.userName}</Text>
          <Text style={styles.visitRestaurant}>{visit.restaurantName}</Text>
          <View style={[styles.scoreBadgeLarge, { backgroundColor: scorePalette(visit.score).badgeBg }]}>
            <Text style={[styles.scoreTextLarge, { color: scorePalette(visit.score).badgeText }]}>
              {visit.score.toFixed(1)}
            </Text>
          </View>
          {visit.note ? (
            <Text style={styles.visitNote} numberOfLines={3}>"{visit.note}"</Text>
          ) : null}
          {visit.dishes && visit.dishes.length > 0 ? (
            <View style={styles.dishRow}>
              {visit.dishes.slice(0, 3).map((d, i) => (
                <View key={i} style={styles.dishChip}>
                  <Text style={styles.dishText}>{d}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <Text style={styles.footer}>savry.app — Tu círculo gastronómico</Text>
        </View>
      </View>
    );
  }
);

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
  },
  card: {
    width: 360,
    backgroundColor: '#fdf9f2',
    borderRadius: 24,
    padding: 28,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontFamily: 'NotoSerif-Italic',
    fontSize: 28,
    color: '#032417',
    fontStyle: 'italic',
  },
  headerSub: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: '#727973',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  userName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#032417',
  },
  listContainer: {
    gap: 10,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#032417',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: '#ffffff',
  },
  rankName: {
    flex: 1,
    fontFamily: 'NotoSerif-Bold',
    fontSize: 15,
    color: '#032417',
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 14,
  },
  scoreBadgeLarge: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  scoreTextLarge: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 32,
  },
  visitRestaurant: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 22,
    color: '#032417',
    textAlign: 'center',
  },
  visitNote: {
    fontFamily: 'NotoSerif-Italic',
    fontSize: 14,
    color: '#424844',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  dishRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  dishChip: {
    backgroundColor: '#f7f3ec',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  dishText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    color: '#032417',
  },
  footer: {
    fontFamily: 'Manrope-Medium',
    fontSize: 11,
    color: '#727973',
    textAlign: 'center',
    marginTop: 4,
  },
});
