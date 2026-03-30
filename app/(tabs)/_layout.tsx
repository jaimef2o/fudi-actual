import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const TAB_CONFIG = {
  feed:      { icon: 'home'       as const, label: 'Feed' },
  listas:    { icon: 'receipt'    as const, label: 'Listas' },
  nuevo:     { icon: 'add-circle' as const, label: '+' },
  descubrir: { icon: 'explore'    as const, label: 'Descubrir' },
  amigos:    { icon: 'group'      as const, label: 'Amigos' },
} as const;

type TabKey = keyof typeof TAB_CONFIG;

function CustomTabBar({ state, navigation }: any) {
  return (
    <BlurView intensity={80} tint="systemChromeMaterialLight" style={s.bar}>
      {state.routes.map((route: any, index: number) => {
        const focused  = state.index === index;
        const tab      = TAB_CONFIG[route.name as TabKey];
        const isCenter = route.name === 'nuevo';

        const onPress = () => {
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

        if (isCenter) {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={s.center}
              activeOpacity={0.7}
              accessibilityLabel="Crear nueva visita"
              accessibilityRole="button"
            >
              <MaterialIcons name="add-circle" size={42} color="#032417" />
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.7}
            style={[s.tab, focused && s.tabActive]}
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
          >
            <MaterialIcons
              name={tab.icon}
              size={focused ? 21 : 22}
              color={focused ? '#032417' : '#9fa69f'}
            />
            <Text style={[s.label, focused && s.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </BlurView>
  );
}

const s = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: Platform.OS === 'ios' ? 86 : 68,
    backgroundColor: 'rgba(253,249,242,0.65)',
    overflow: 'hidden' as const,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#1c1c18',
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
    backgroundColor: '#c7ef48',
    transform: [{ translateY: -6 }],
    shadowColor: '#546b00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  label: {
    fontFamily: 'Manrope-Medium',
    fontSize: 11,
    color: '#a0a6a1',
    letterSpacing: 0.3,
  },
  labelActive: {
    fontFamily: 'Manrope-Bold',
    color: '#032417',
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
