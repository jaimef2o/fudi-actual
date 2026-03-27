import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Icons matched to prototype Material Symbols
const TAB_CONFIG = {
  feed: { icon: 'home' as const, label: 'Feed' },
  listas: { icon: 'receipt' as const, label: 'Listas' },
  nuevo: { icon: 'add-circle' as const, label: '+' },
  descubrir: { icon: 'explore' as const, label: 'Descubrir' },
  amigos: { icon: 'group' as const, label: 'Amigos' },
} as const;

type TabKey = keyof typeof TAB_CONFIG;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const tabKey = route.name as TabKey;
        const tab = TAB_CONFIG[tabKey];
        const isCenter = route.name === 'nuevo';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (isCenter) {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.centerTab}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add-circle" size={40} color="#032417" />
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.7}
            style={[styles.tabItem, isFocused && styles.tabItemActive]}
          >
            <MaterialIcons
              name={tab.icon}
              size={isFocused ? 22 : 24}
              color={isFocused ? '#032417' : '#9fa69f'}
            />
            {isFocused ? (
              <Text style={[styles.tabLabel, styles.tabLabelActive]}>
                {tab.label}
              </Text>
            ) : (
              <View style={styles.tabDot} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 88 : 72,
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 2,
  },
  tabItemActive: {
    backgroundColor: '#c7ef48',
    transform: [{ translateY: -8 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  centerTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#727973',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Manrope-Bold',
  },
  tabLabelActive: {
    color: '#032417',
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(114,121,115,0.25)',
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
