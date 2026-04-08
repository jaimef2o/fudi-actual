import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../lib/theme/colors';

const TAB_CONFIG = {
  feed:      { icon: 'home'       as const, label: 'Feed' },
  listas:    { icon: 'receipt'    as const, label: 'Listas' },
  nuevo:     { icon: 'add-circle' as const, label: '+' },
  descubrir: { icon: 'explore'    as const, label: 'Descubrir' },
  amigos:    { icon: 'group'      as const, label: 'Amigos' },
} as const;

type TabKey = keyof typeof TAB_CONFIG;

function CustomTabBar({ state, navigation }: any) {
  // Find the center route for rendering outside the BlurView
  const centerIndex = state.routes.findIndex((r: any) => r.name === 'nuevo');
  const centerRoute = state.routes[centerIndex];

  const makePressHandler = (route: any, focused: boolean) => () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <View style={s.barWrapper}>
      {/* Center FAB — rendered OUTSIDE BlurView so overflow:hidden doesn't clip it */}
      <TouchableOpacity
        onPress={makePressHandler(centerRoute, state.index === centerIndex)}
        style={s.centerFab}
        activeOpacity={0.85}
        accessibilityLabel="Crear nueva visita"
        accessibilityRole="button"
      >
        <View style={s.centerOuter}>
          <LinearGradient
            colors={[COLORS.secondaryContainer, COLORS.secondaryFixedDim]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.centerGradient}
          >
            <MaterialIcons name="add" size={28} color={COLORS.primary} />
          </LinearGradient>
        </View>
      </TouchableOpacity>

      <BlurView intensity={80} tint="systemChromeMaterialLight" style={s.bar}>
        {state.routes.map((route: any, index: number) => {
          const focused  = state.index === index;
          const tab      = TAB_CONFIG[route.name as TabKey];
          const isCenter = route.name === 'nuevo';

          if (isCenter) {
            // Invisible spacer to keep tab positions correct
            return <View key={route.key} style={s.centerSpacer} />;
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={makePressHandler(route, focused)}
              activeOpacity={0.7}
              style={[s.tab, focused && s.tabActive]}
              accessibilityLabel={tab.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
            >
              <MaterialIcons
                name={tab.icon}
                size={focused ? 23 : 21}
                color={focused ? COLORS.primary : COLORS.outline}
              />
              <Text style={[s.label, focused && s.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

const BAR_HEIGHT = Platform.OS === 'ios' ? 86 : 68;

const s = StyleSheet.create({
  barWrapper: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: BAR_HEIGHT,
    overflow: 'visible' as const,
  },
  bar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: BAR_HEIGHT,
    backgroundColor: 'rgba(253,249,242,0.65)',
    overflow: 'hidden' as const,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 22 : 6,
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 999,
    gap: 3,
    minHeight: 44,
  },
  tabActive: {
    backgroundColor: COLORS.secondaryContainer,
    transform: [{ translateY: -6 }],
    shadowColor: COLORS.onSecondaryContainer,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  centerSpacer: {
    flex: 1,
  },
  centerFab: {
    position: 'absolute',
    alignSelf: 'center',
    left: '50%',
    marginLeft: -27,
    top: -14,
    zIndex: 10,
  },
  centerOuter: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(253,249,242,0.95)',
    padding: 3,
    shadowColor: COLORS.onSecondaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  centerGradient: {
    flex: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Manrope-Medium',
    fontSize: 11,
    color: COLORS.outline,
    letterSpacing: 0.3,
  },
  labelActive: {
    fontFamily: 'Manrope-Bold',
    color: COLORS.primary,
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="listas" />
      <Tabs.Screen name="nuevo" />
      <Tabs.Screen name="descubrir" />
      <Tabs.Screen name="amigos" />
    </Tabs>
  );
}
