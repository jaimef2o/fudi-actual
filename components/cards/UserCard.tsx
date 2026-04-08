import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Avatar from '../Avatar';
import { COLORS } from '../../lib/theme/colors';

type UserCardVariant = 'search' | 'follow-request' | 'new-follower';
type RelationshipStyle = 'follow' | 'following' | 'pending' | 'mutual';

type UserCardUser = {
  id: string;
  name: string;
  handle?: string | null;
  avatar_url?: string | null;
  city?: string | null;
};

type UserCardProps = {
  user: UserCardUser;
  variant: UserCardVariant;
  /** Called when the primary action button is pressed (follow, accept, follow-back) */
  onPrimaryAction?: () => void;
  /** Called when the secondary action button is pressed (reject for follow-request) */
  onSecondaryAction?: () => void;
  primaryLoading?: boolean;
  secondaryLoading?: boolean;
  /** For 'search' variant: the label to display on the button */
  relationshipLabel?: string | null;
  /** For 'search' variant: determines button styling */
  relationshipStyle?: RelationshipStyle;
  /** Subtitle override. If not set, defaults to @handle, city, or contextual text */
  subtitle?: string | null;
  /** Whether the entire card is in a compact/inline context (e.g. notification panel) */
  compact?: boolean;
  /** Optional callback when navigating to profile (e.g. to close a modal first) */
  onNavigate?: () => void;
};

const RELATIONSHIP_LABELS: Record<RelationshipStyle, string> = {
  follow: 'Seguir',
  following: 'Siguiendo',
  pending: 'Solicitado',
  mutual: 'Amigos',
};

export default function UserCard({
  user,
  variant,
  onPrimaryAction,
  onSecondaryAction,
  primaryLoading = false,
  secondaryLoading = false,
  relationshipLabel,
  relationshipStyle = 'follow',
  subtitle,
  compact = false,
  onNavigate,
}: UserCardProps) {
  const isConnected = relationshipStyle !== 'follow';
  const avatarSize = compact ? 40 : variant === 'search' ? 48 : 44;

  function navigateToProfile() {
    onNavigate?.();
    router.push(`/profile/${user.id}`);
  }

  // Resolve subtitle text
  const resolvedSubtitle =
    subtitle ??
    (variant === 'new-follower'
      ? 'Te ha empezado a seguir'
      : user.handle
        ? `@${user.handle}`
        : user.city ?? '');

  // Resolve button label for search variant
  const buttonLabel = relationshipLabel ?? RELATIONSHIP_LABELS[relationshipStyle];

  return (
    <View style={[
      compact ? compactStyles.row : cardStyles.card,
      variant === 'follow-request' && !compact && cardStyles.cardRequest,
    ]}>
      {/* Avatar */}
      <TouchableOpacity onPress={navigateToProfile} activeOpacity={0.8}>
        <Avatar uri={user.avatar_url} size={avatarSize} />
      </TouchableOpacity>

      {/* Name + subtitle */}
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={navigateToProfile}
        activeOpacity={0.8}
      >
        <Text
          style={compact ? compactStyles.name : cardStyles.name}
          numberOfLines={1}
        >
          {user.name}
        </Text>
        {resolvedSubtitle ? (
          <Text
            style={compact ? compactStyles.sub : cardStyles.handle}
            numberOfLines={1}
          >
            {resolvedSubtitle}
          </Text>
        ) : null}
      </TouchableOpacity>

      {/* Action buttons */}
      {variant === 'search' && (
        <SearchButton
          label={buttonLabel}
          style={relationshipStyle}
          loading={primaryLoading}
          onPress={onPrimaryAction}
          compact={compact}
        />
      )}

      {variant === 'follow-request' && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* Reject */}
          <TouchableOpacity
            style={compact ? compactStyles.rejectBtn : cardStyles.rejectBtn}
            onPress={onSecondaryAction}
            disabled={primaryLoading || secondaryLoading}
            activeOpacity={0.8}
          >
            {secondaryLoading ? (
              <ActivityIndicator size="small" color={COLORS.outline} />
            ) : (
              <MaterialIcons
                name="close"
                size={compact ? 15 : 16}
                color={COLORS.outline}
              />
            )}
          </TouchableOpacity>
          {/* Accept */}
          <TouchableOpacity
            style={compact ? compactStyles.acceptBtn : cardStyles.acceptBtn}
            onPress={onPrimaryAction}
            disabled={primaryLoading || secondaryLoading}
            activeOpacity={0.8}
          >
            {primaryLoading ? (
              <ActivityIndicator size="small" color={COLORS.onSecondaryContainer} />
            ) : compact ? (
              <MaterialIcons name="check" size={15} color={COLORS.onSecondaryContainer} />
            ) : (
              <Text style={cardStyles.acceptBtnText}>Seguir</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {variant === 'new-follower' && (
        <TouchableOpacity
          style={compact ? compactStyles.followBackBtn : cardStyles.acceptBtn}
          onPress={onPrimaryAction}
          disabled={primaryLoading}
          activeOpacity={0.8}
        >
          {primaryLoading ? (
            <ActivityIndicator size="small" color={COLORS.onSecondaryContainer} />
          ) : (
            <Text style={compact ? compactStyles.followBackText : cardStyles.acceptBtnText}>
              Seguir
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Search button sub-component ─────────────────────────────────────────────

function SearchButton({
  label,
  style,
  loading,
  onPress,
  compact,
}: {
  label: string;
  style: RelationshipStyle;
  loading: boolean;
  onPress?: () => void;
  compact: boolean;
}) {
  const isConnected = style !== 'follow';

  const btnStyle = [
    cardStyles.followBtn,
    isConnected && cardStyles.followBtnConnected,
    style === 'mutual' && cardStyles.followBtnMutual,
    style === 'pending' && cardStyles.followBtnPending,
  ];

  const textColor = style === 'pending'
    ? COLORS.outline
    : isConnected
      ? COLORS.onSecondaryContainer
      : COLORS.onPrimary;

  return (
    <TouchableOpacity
      style={btnStyle}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {style === 'mutual' && (
            <MaterialIcons
              name="check"
              size={13}
              color={COLORS.onSecondaryContainer}
              style={{ marginRight: 2 }}
            />
          )}
          {style === 'pending' && (
            <MaterialIcons
              name="schedule"
              size={13}
              color={COLORS.outline}
              style={{ marginRight: 2 }}
            />
          )}
          <Text style={[
            cardStyles.followBtnText,
            isConnected && cardStyles.followBtnTextConnected,
            style === 'pending' && { color: COLORS.outline },
          ]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles for full card mode (amigos.tsx) ──────────────────────────────────

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 20,
    padding: 14,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardRequest: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondaryContainer,
  },
  name: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: COLORS.primary,
  },
  handle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: COLORS.outline,
    marginTop: 2,
  },
  // Follow button (search variant)
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 80,
    justifyContent: 'center',
  },
  followBtnConnected: {
    backgroundColor: COLORS.secondaryContainer,
  },
  followBtnMutual: {
    backgroundColor: COLORS.secondaryContainer,
  },
  followBtnPending: {
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  followBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: COLORS.onPrimary,
  },
  followBtnTextConnected: {
    color: COLORS.onSecondaryContainer,
  },
  // Reject / Accept (follow-request & new-follower variants)
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: COLORS.secondaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  acceptBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: COLORS.onSecondaryContainer,
  },
});

// ─── Styles for compact/inline mode (notification panel in feed.tsx) ─────────

const compactStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  name: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    color: COLORS.primary,
  },
  sub: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: COLORS.outline,
    marginTop: 1,
  },
  rejectBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBackBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBackText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: COLORS.onSecondaryContainer,
  },
});
