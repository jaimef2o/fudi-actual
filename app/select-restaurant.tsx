import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { searchPlaces, getPlaceDetails } from '../lib/api/places';
import { upsertRestaurant } from '../lib/api/restaurants';
import { useAppStore } from '../store';
import { useProfile } from '../lib/hooks/useProfile';
import type { PlaceCandidate } from '../lib/api/places';

export default function SelectRestaurantScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const { data: profile } = useProfile(currentUser?.id);
  const userCity = (profile as any)?.city ?? null;

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<PlaceCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (search.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const places = await searchPlaces(search, userCity);
      setResults(places);
      setLoading(false);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  async function handleSelect(place: PlaceCandidate) {
    setSelecting(place.place_id);
    try {
      // Fetch full details then upsert into DB
      const details = await getPlaceDetails(place.place_id);
      if (details) {
        const row = await upsertRestaurant({
          google_place_id: details.place_id,
          name: details.name,
          address: details.formatted_address,
          neighborhood: details.vicinity,
          lat: details.geometry.location.lat,
          lng: details.geometry.location.lng,
          google_types: details.types,
          price_level: details.price_level,
        });
        router.replace(`/journey-b/${row.id}`);
      } else {
        // Fallback: navigate by place_id (handled gracefully in journey-b)
        router.replace(`/journey-b/${place.place_id}`);
      }
    } catch {
      router.replace(`/journey-b/${place.place_id}`);
    } finally {
      setSelecting(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#032417" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>¿Qué pedimos?</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hint */}
        <Text style={styles.hint}>
          Busca el restaurante donde estás para ver qué piden tus amigos
        </Text>

        {/* Search */}
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#727973" />
          <TextInput
            style={styles.searchInput}
            placeholder="Nombre del restaurante..."
            placeholderTextColor="#c1c8c2"
            value={search}
            onChangeText={setSearch}
            autoFocus
            returnKeyType="search"
          />
          {loading ? (
            <ActivityIndicator size="small" color="#727973" />
          ) : search.length > 0 ? (
            <TouchableOpacity onPress={() => { setSearch(''); setResults([]); }}>
              <MaterialIcons name="close" size={18} color="#727973" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Results */}
        <View style={styles.list}>
          {results.map((place) => (
            <TouchableOpacity
              key={place.place_id}
              style={styles.card}
              activeOpacity={0.8}
              disabled={selecting !== null}
              onPress={() => handleSelect(place)}
            >
              <View style={styles.cardIconWrap}>
                <MaterialIcons name="restaurant" size={22} color="#032417" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {place.structured_formatting.main_text}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {place.structured_formatting.secondary_text}
                </Text>
              </View>
              {selecting === place.place_id ? (
                <ActivityIndicator size="small" color="#032417" />
              ) : (
                <MaterialIcons name="chevron-right" size={20} color="#c1c8c2" />
              )}
            </TouchableOpacity>
          ))}

          {!loading && search.trim().length >= 2 && results.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="search-off" size={40} color="#c1c8c2" />
              <Text style={styles.emptyText}>Sin resultados para "{search}"</Text>
              <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 13, color: '#c1c8c2', textAlign: 'center' }}>
                Prueba con otro nombre o dirección
              </Text>
            </View>
          )}

          {search.trim().length < 2 && (
            <View style={{ alignItems: 'center', paddingTop: 24, gap: 8 }}>
              <MaterialIcons name="location-searching" size={36} color="#e6e2db" />
              <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 13, color: '#c1c8c2', textAlign: 'center' }}>
                Escribe al menos 2 caracteres para buscar
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: Platform.OS === 'ios' ? 108 : 88,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(253,249,242,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  headerBtn: { padding: 8, minWidth: 40 },
  headerTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 20,
    color: '#032417',
    flex: 1,
    textAlign: 'center',
  },
  container: {
    paddingTop: 16,
    paddingBottom: 48,
    paddingHorizontal: 20,
    gap: 20,
  },
  hint: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#727973',
    textAlign: 'center',
    lineHeight: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f7f3ec',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(193,200,194,0.3)',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: '#1c1c18',
  },
  list: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f7f3ec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardName: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 15,
    color: '#032417',
  },
  cardMeta: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#727973',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    color: '#727973',
    textAlign: 'center',
  },
});
