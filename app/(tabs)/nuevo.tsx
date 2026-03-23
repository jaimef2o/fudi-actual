import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function NuevoScreen() {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => router.back()}
      />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>¿Qué quieres hacer?</Text>

        <TouchableOpacity
          style={styles.option}
          activeOpacity={0.8}
          onPress={() => router.push('/select-restaurant')}
        >
          <View style={[styles.optionIcon, { backgroundColor: '#1a3a2b' }]}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={28} color="#c7ef48" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>¿Qué pedimos?</Text>
            <Text style={styles.optionSubtitle}>
              Consulta qué piden tus amigos en cualquier restaurante
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#727973" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.option, { backgroundColor: '#f7f3ec' }]}
          activeOpacity={0.8}
          onPress={() => router.push('/registrar-visita')}
        >
          <View style={[styles.optionIcon, { backgroundColor: '#c7ef48' }]}>
            <MaterialCommunityIcons name="plus" size={28} color="#032417" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Registrar visita</Text>
            <Text style={styles.optionSubtitle}>
              Documenta tu experiencia en un restaurante
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#727973" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#fdf9f2',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 110 : 90,
    gap: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#e6e2db',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 24,
    color: '#032417',
    marginBottom: 8,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: '#032417',
  },
  optionSubtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#424844',
    lineHeight: 18,
  },
});
