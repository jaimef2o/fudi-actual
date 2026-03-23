import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { useCreateVisit } from '../lib/hooks/useVisit';
import { searchPlaces, getPlaceDetails, getPhotoUrl, extractNeighborhood, type PlaceCandidate } from '../lib/api/places';
import { upsertRestaurant, getRestaurant } from '../lib/api/restaurants';
import { pickImage, compressAndUpload } from '../lib/storage';

const SENTIMENTS = [
  { key: 'loved' as const, icon: 'favorite' as const, label: 'Me encantó', color: '#c7ef48', textColor: '#032417', iconColor: '#032417' },
  { key: 'fine' as const, icon: 'thumb-up' as const, label: 'Estuvo bien', color: '#fde8a0', textColor: '#6b4f00', iconColor: '#6b4f00' },
  { key: 'disliked' as const, icon: 'thumb-down' as const, label: 'No me convenció', color: '#fdd5c8', textColor: '#7a2020', iconColor: '#7a2020' },
];

export default function RegistrarVisitaScreen() {
  const { restaurantId: paramRestaurantId } = useLocalSearchParams<{ restaurantId?: string }>();
  const currentUser = useAppStore((s) => s.currentUser);
  const { mutateAsync: createVisit, isPending } = useCreateVisit();

  const [sentiment, setSentiment] = useState<'loved' | 'fine' | 'disliked' | null>(null);
  const [dishes, setDishes] = useState<string[]>(['']);
  const [dishPhotos, setDishPhotos] = useState<(string | null)[]>([null]); // one per dish slot
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);   // restaurant photos
  const [uploading, setUploading] = useState(false);

  // Restaurant search
  const [restaurantQuery, setRestaurantQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceCandidate[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<{ id: string; name: string } | null>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If navigated from a specific restaurant (UUID), fetch its real name
  useEffect(() => {
    if (!paramRestaurantId) return;
    const isUuid = /^[0-9a-f-]{36}$/i.test(paramRestaurantId);
    if (!isUuid) return;
    setLoadingRestaurant(true);
    getRestaurant(paramRestaurantId)
      .then((r) => {
        if (r) {
          setSelectedRestaurant({ id: r.id, name: r.name });
          setRestaurantQuery(r.name);
        }
      })
      .catch(() => {
        setSelectedRestaurant({ id: paramRestaurantId, name: 'Restaurante seleccionado' });
      })
      .finally(() => setLoadingRestaurant(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramRestaurantId]);

  // Debounced search
  useEffect(() => {
    if (selectedRestaurant) return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!restaurantQuery.trim() || restaurantQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      const results = await searchPlaces(restaurantQuery);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 350);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [restaurantQuery, selectedRestaurant]);

  async function handleSelectPlace(candidate: PlaceCandidate) {
    setShowSuggestions(false);
    setLoadingRestaurant(true);
    try {
      const details = await getPlaceDetails(candidate.place_id);
      if (!details) throw new Error('No se pudieron obtener los detalles del lugar.');

      const neighborhood = extractNeighborhood(candidate.structured_formatting.secondary_text);
      const coverPhotoUrl = details.photos?.[0]
        ? getPhotoUrl(details.photos[0].photo_reference)
        : undefined;

      const restaurant = await upsertRestaurant({
        google_place_id: details.place_id,
        name: details.name,
        address: details.formatted_address,
        neighborhood,
        city: candidate.structured_formatting.secondary_text.split(',').reverse()[1]?.trim() ?? '',
        lat: details.geometry.location.lat,
        lng: details.geometry.location.lng,
        price_level: details.price_level,
        cover_image_url: coverPhotoUrl,
      });

      setSelectedRestaurant({ id: restaurant.id, name: details.name });
      setRestaurantQuery(details.name);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo seleccionar el restaurante.');
    } finally {
      setLoadingRestaurant(false);
    }
  }

  function clearRestaurant() {
    setSelectedRestaurant(null);
    setRestaurantQuery('');
    setSuggestions([]);
  }

  const addDish = () => {
    setDishes((prev) => [...prev, '']);
    setDishPhotos((prev) => [...prev, null]);
  };

  async function handleDishPhoto(index: number) {
    const uri = await pickImage({ aspect: [1, 1], allowsEditing: true, quality: 0.8 });
    if (uri) {
      setDishPhotos((prev) => {
        const copy = [...prev];
        copy[index] = uri;
        return copy;
      });
    }
  }

  function removeDishPhoto(index: number) {
    setDishPhotos((prev) => {
      const copy = [...prev];
      copy[index] = null;
      return copy;
    });
  }

  async function handleAddPhoto() {
    if (photos.length >= 5) {
      Alert.alert('Máximo de fotos', 'Puedes añadir hasta 5 fotos por visita.');
      return;
    }
    const uri = await pickImage({ aspect: [4, 3], allowsEditing: true, quality: 0.8 });
    if (uri) setPhotos((prev) => [...prev, uri]);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!currentUser) {
      Alert.alert('Error', 'Debes estar autenticado para registrar una visita.');
      return;
    }
    if (!selectedRestaurant) {
      Alert.alert('Falta el restaurante', 'Selecciona un restaurante antes de continuar.');
      return;
    }
    if (!sentiment) return;

    const validDishIndices = dishes
      .map((d, i) => ({ name: d.trim(), idx: i }))
      .filter((d) => d.name.length > 0);

    try {
      setUploading(true);
      const ts = Date.now();

      // Upload restaurant photos
      const uploadedRestaurantUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        try {
          const url = await compressAndUpload(photos[i], `visits/${currentUser.id}/${ts}_r${i}.jpg`);
          uploadedRestaurantUrls.push(url);
        } catch { /* skip */ }
      }

      // Upload dish photos (keyed by original dish index)
      const uploadedDishUrls: Record<number, string> = {};
      for (const { idx } of validDishIndices) {
        const localUri = dishPhotos[idx];
        if (!localUri) continue;
        try {
          const url = await compressAndUpload(localUri, `visits/${currentUser.id}/${ts}_d${idx}.jpg`);
          uploadedDishUrls[idx] = url;
        } catch { /* skip */ }
      }

      setUploading(false);

      const validDishes = validDishIndices.map(({ name, idx }, pos) => ({
        dish_name: name,
        rank_position: pos + 1,
        photo_url: uploadedDishUrls[idx] ?? undefined,
      }));

      const visit = await createVisit({
        user_id: currentUser.id,
        restaurant_id: selectedRestaurant.id,
        sentiment,
        note: note.trim() || undefined,
        dishes: validDishes,
        photos: uploadedRestaurantUrls.map((url) => ({ photo_url: url, type: 'restaurant' as const })),
        visibility: 'friends',
      });

      router.push(
        `/comparison/${visit.id}?restaurantName=${encodeURIComponent(selectedRestaurant.name)}`
      );
    } catch (e: any) {
      setUploading(false);
      Alert.alert('Error al guardar', e.message ?? 'No se pudo guardar la visita. Inténtalo de nuevo.');
    }
  }

  const isSubmitting = isPending || uploading;

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            const hasData = selectedRestaurant || sentiment || note.trim() || dishes.some((d) => d.trim()) || photos.length > 0;
            if (!hasData) { router.back(); return; }
            Alert.alert(
              'Descartar cambios',
              '¿Seguro que quieres salir? Perderás los datos introducidos.',
              [
                { text: 'Seguir editando', style: 'cancel' },
                { text: 'Descartar', style: 'destructive', onPress: () => router.back() },
              ]
            );
          }}
          style={styles.headerBtn}
        >
          <MaterialIcons name="close" size={24} color="#032417" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar Visita</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* RESTAURANTE */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>RESTAURANTE</Text>
          <View style={{ position: 'relative', zIndex: 10 }}>
            <View style={[styles.searchBox, selectedRestaurant && styles.searchBoxSelected]}>
              {loadingRestaurant ? (
                <ActivityIndicator size="small" color="#727973" />
              ) : (
                <MaterialIcons
                  name={selectedRestaurant ? 'check-circle' : 'search'}
                  size={20}
                  color={selectedRestaurant ? '#546b00' : '#727973'}
                />
              )}
              <TextInput
                style={styles.searchInput}
                placeholder="¿Dónde comiste?"
                placeholderTextColor="#c1c8c2"
                value={restaurantQuery}
                onChangeText={(v) => {
                  if (selectedRestaurant) clearRestaurant();
                  setRestaurantQuery(v);
                }}
                editable={!loadingRestaurant}
                returnKeyType="search"
              />
              {(restaurantQuery.length > 0 || selectedRestaurant) && (
                <TouchableOpacity onPress={clearRestaurant} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name="close" size={18} color="#727973" />
                </TouchableOpacity>
              )}
            </View>

            {/* Suggestions dropdown */}
            {showSuggestions && (
              <View style={styles.dropdown}>
                {suggestions.map((s) => (
                  <TouchableOpacity
                    key={s.place_id}
                    style={styles.dropdownItem}
                    onPress={() => handleSelectPlace(s)}
                    activeOpacity={0.75}
                  >
                    <MaterialIcons name="restaurant" size={16} color="#727973" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dropdownMain} numberOfLines={1}>
                        {s.structured_formatting.main_text}
                      </Text>
                      <Text style={styles.dropdownSub} numberOfLines={1}>
                        {s.structured_formatting.secondary_text}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          {selectedRestaurant && (
            <View style={styles.selectedBadge}>
              <MaterialIcons name="check-circle" size={14} color="#546b00" />
              <Text style={styles.selectedBadgeText}>{selectedRestaurant.name}</Text>
            </View>
          )}
        </View>

        {/* ¿CÓMO ESTUVO? */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>¿CÓMO ESTUVO?</Text>
          <View style={styles.sentimentRow}>
            {SENTIMENTS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.sentimentBtn,
                  sentiment === s.key && { backgroundColor: s.color, borderColor: s.color },
                ]}
                onPress={() => setSentiment(s.key)}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={s.icon}
                  size={26}
                  color={sentiment === s.key ? s.iconColor : '#727973'}
                />
                <Text style={[
                  styles.sentimentLabel,
                  sentiment === s.key && { color: s.textColor, fontFamily: 'Manrope-Bold' },
                ]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FOTOS */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>FOTOS</Text>
            <Text style={styles.optionalText}>Opcional · {photos.length}/5</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
            {photos.map((uri, i) => (
              <View key={i} style={styles.photoThumb}>
                <Image source={{ uri }} style={styles.photoThumbImg} />
                <TouchableOpacity
                  style={styles.photoRemoveBtn}
                  onPress={() => removePhoto(i)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <MaterialIcons name="cancel" size={20} color="#032417" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 5 && (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddPhoto} activeOpacity={0.75}>
                <MaterialIcons name="add-a-photo" size={24} color="#727973" />
                <Text style={styles.addPhotoText}>Añadir{'\n'}foto</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* PLATOS */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>PLATOS</Text>
            <Text style={styles.optionalText}>Opcional</Text>
          </View>
          {dishes.map((_, i) => (
            <View key={i} style={styles.dishRowWrap}>
              <View style={styles.dishRow}>
                <View style={styles.dishRankCircle}>
                  <Text style={styles.dishRankText}>{i + 1}</Text>
                </View>
                <TextInput
                  style={styles.dishInput}
                  placeholder="Nombre del plato..."
                  placeholderTextColor="#c1c8c2"
                  value={dishes[i]}
                  onChangeText={(v) => {
                    const copy = [...dishes];
                    copy[i] = v;
                    setDishes(copy);
                  }}
                  returnKeyType="next"
                />
                {/* Dish photo button */}
                <TouchableOpacity
                  onPress={() => handleDishPhoto(i)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.dishPhotoBtn}
                >
                  {dishPhotos[i] ? (
                    <Image source={{ uri: dishPhotos[i]! }} style={styles.dishPhotoThumb} />
                  ) : (
                    <MaterialIcons name="add-a-photo" size={18} color="#727973" />
                  )}
                </TouchableOpacity>
                {dishes.length > 1 && (
                  <TouchableOpacity
                    onPress={() => {
                      setDishes(dishes.filter((_, idx) => idx !== i));
                      setDishPhotos(dishPhotos.filter((_, idx) => idx !== i));
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="remove-circle-outline" size={20} color="#c1c8c2" />
                  </TouchableOpacity>
                )}
              </View>
              {/* Photo preview + remove */}
              {dishPhotos[i] && (
                <View style={styles.dishPhotoPreviewRow}>
                  <Image source={{ uri: dishPhotos[i]! }} style={styles.dishPhotoPreview} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dishPhotoPreviewLabel}>Foto del plato añadida</Text>
                    <TouchableOpacity onPress={() => removeDishPhoto(i)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                      <Text style={styles.dishPhotoRemoveText}>Eliminar foto</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addDishBtn} onPress={addDish} activeOpacity={0.7}>
            <MaterialIcons name="add" size={20} color="#032417" />
            <Text style={styles.addDishText}>Añadir plato</Text>
          </TouchableOpacity>
        </View>

        {/* NOTA */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>NOTA</Text>
            <Text style={styles.optionalText}>Opcional</Text>
          </View>
          <TextInput
            style={styles.noteInput}
            placeholder="Cuenta tu opinión personal..."
            placeholderTextColor="#c1c8c2"
            multiline
            numberOfLines={4}
            value={note}
            onChangeText={setNote}
            textAlignVertical="top"
          />
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, (!sentiment || !selectedRestaurant || isSubmitting) && styles.ctaBtnDisabled]}
          activeOpacity={0.85}
          disabled={!sentiment || !selectedRestaurant || isSubmitting}
          onPress={handleSubmit}
        >
          {isSubmitting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.ctaBtnText}>
                {uploading ? 'Subiendo fotos...' : 'Guardando...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.ctaBtnText}>
              {!selectedRestaurant
                ? 'Selecciona un restaurante'
                : !sentiment
                ? 'Elige cómo estuvo para continuar'
                : 'Guardar y ubicar en ranking →'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: Platform.OS === 'ios' ? 108 : 88,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(253,249,242,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  headerBtn: { padding: 8 },
  headerTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: '#032417',
    flex: 1,
    textAlign: 'center',
  },
  container: {
    paddingTop: 16,
    paddingBottom: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  section: {
    marginBottom: 20,
    gap: 12,
  },
  sectionLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#727973',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionalText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    color: '#727973',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#e6e2db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchBoxSelected: {
    borderColor: '#c7ef48',
    backgroundColor: '#f7f3ec',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: '#1c1c18',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 100,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  dropdownMain: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    color: '#032417',
  },
  dropdownSub: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#727973',
    marginTop: 1,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fad8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  selectedBadgeText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    color: '#546b00',
  },
  sentimentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sentimentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#f7f3ec',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
  },
  sentimentLabel: {
    fontFamily: 'Manrope-Medium',
    fontSize: 11,
    color: '#424844',
    textAlign: 'center',
  },
  // Photos
  photosRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 4,
  },
  photoThumb: {
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: 'visible',
    position: 'relative',
  },
  photoThumbImg: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: '#e6e2db',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#c7ef48',
    borderRadius: 999,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoBtn: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: '#f7f3ec',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(193,200,194,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 10,
    color: '#727973',
    textAlign: 'center',
    lineHeight: 14,
  },
  // Dishes
  dishRowWrap: {
    gap: 0,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f7f3ec',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dishPhotoBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ebe8e1',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dishPhotoThumb: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  dishPhotoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0fad8',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dishPhotoPreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  dishPhotoPreviewLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: '#546b00',
  },
  dishPhotoRemoveText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 11,
    color: '#7a2020',
    marginTop: 2,
  },
  dishRankCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e6e2db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dishRankText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    color: '#424844',
  },
  dishInput: {
    flex: 1,
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#1c1c18',
  },
  addDishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'rgba(193,200,194,0.5)',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
  },
  addDishText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#032417',
  },
  noteInput: {
    backgroundColor: '#f7f3ec',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#1c1c18',
    minHeight: 100,
  },
  ctaBtn: {
    marginTop: 12,
    backgroundColor: '#032417',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaBtnDisabled: {
    backgroundColor: '#e6e2db',
  },
  ctaBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#ffffff',
  },
});
