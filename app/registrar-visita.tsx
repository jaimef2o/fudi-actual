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
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { useCreateVisit, useRestaurantExistingScore } from '../lib/hooks/useVisit';
import { useProfile } from '../lib/hooks/useProfile';
import { searchUsers } from '../lib/api/users';
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
  const showToast = useAppStore((s) => s.showToast);
  const { data: profile } = useProfile(currentUser?.id);
  const userCity = (profile as any)?.city ?? null;
  const { mutateAsync: createVisit, isPending } = useCreateVisit();

  const [sentiment, setSentiment] = useState<'loved' | 'fine' | 'disliked' | null>(null);
  const [spendPerPerson, setSpendPerPerson] = useState<'0-20' | '20-35' | '35-60' | '60+' | null>(null);
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [taggedUserIds, setTaggedUserIds] = useState<string[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<{ id: string; name: string; handle: string | null; avatar_url: string | null }[]>([]);
  const [handleInput, setHandleInput] = useState('');
  const [handleResults, setHandleResults] = useState<any[]>([]);
  const [handleSearching, setHandleSearching] = useState(false);
  const handleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dish model (v2: free text, binary highlighted, insertion order)
  type AddedDish = { name: string; highlighted: boolean; photo: string | null };
  const [addedDishes, setAddedDishes] = useState<AddedDish[]>([]);
  const [dishInputValue, setDishInputValue] = useState('');
  const dishInputRef = useRef<any>(null);

  // Restaurant search
  const [restaurantQuery, setRestaurantQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceCandidate[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<{ id: string; name: string } | null>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if this restaurant is already in the user's ranking
  const { data: existingRank } = useRestaurantExistingScore(currentUser?.id, selectedRestaurant?.id);

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
      const results = await searchPlaces(restaurantQuery, userCity);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 350);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [restaurantQuery, selectedRestaurant, userCity]);

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
    setAddedDishes([]);
    setDishInputValue('');
  }

  function addDishToList(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (addedDishes.some((d) => d.name.toLowerCase() === trimmed.toLowerCase())) return;
    setAddedDishes((prev) => [...prev, { name: trimmed, highlighted: false, photo: null }]);
    setDishInputValue('');
    dishInputRef.current?.focus();
  }

  function toggleHighlight(index: number) {
    setAddedDishes((prev) =>
      prev.map((d, i) => i === index ? { ...d, highlighted: !d.highlighted } : d)
    );
  }

  function removeDishFromList(index: number) {
    setAddedDishes((prev) => prev.filter((_, i) => i !== index));
  }

  async function addDishPhoto(index: number) {
    const uri = await pickImage({ aspect: [1, 1], allowsEditing: true, quality: 0.8 });
    if (uri) {
      setAddedDishes((prev) =>
        prev.map((d, i) => i === index ? { ...d, photo: uri } : d)
      );
    }
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
    if (!sentiment) {
      Alert.alert('Falta tu valoración', 'Elige cómo estuvo la visita antes de continuar.');
      return;
    }

    Keyboard.dismiss();

    // Flush any dish typed but not yet added
    const pendingDish = dishInputValue.trim();
    let finalDishes = addedDishes;
    if (pendingDish && !addedDishes.some((d) => d.name.toLowerCase() === pendingDish.toLowerCase())) {
      finalDishes = [...addedDishes, { name: pendingDish, highlighted: false }];
      setAddedDishes(finalDishes);
      setDishInputValue('');
    }

    try {
      setUploading(true);
      const ts = Date.now();

      // Upload restaurant photos — surface errors to user
      const uploadedRestaurantUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const url = await compressAndUpload(
          photos[i],
          `visits/${currentUser.id}/${ts}_r${i}.jpg`,
        );
        uploadedRestaurantUrls.push(url);
      }

      // Upload dish photos
      const dishPhotoUrls: { dish_index: number; photo_url: string }[] = [];
      for (let i = 0; i < finalDishes.length; i++) {
        const dishPhoto = finalDishes[i].photo;
        if (dishPhoto) {
          const url = await compressAndUpload(
            dishPhoto,
            `visits/${currentUser.id}/${ts}_d${i}.jpg`,
          );
          dishPhotoUrls.push({ dish_index: i, photo_url: url });
        }
      }

      setUploading(false);

      const visit = await createVisit({
        user_id: currentUser.id,
        restaurant_id: selectedRestaurant.id,
        sentiment,
        note: note.trim() || undefined,
        spend_per_person: spendPerPerson ?? null,
        dishes: finalDishes.map((d, i) => ({ name: d.name, highlighted: d.highlighted, position: i })),
        photos: uploadedRestaurantUrls.map((url) => ({ photo_url: url, type: 'restaurant' as const })),
        visibility: 'friends',
        dish_photo_urls: dishPhotoUrls,
        tagged_user_ids: taggedUserIds.length > 0 ? taggedUserIds : undefined,
      });

      router.navigate(
        `/comparison/${visit.id}?restaurantName=${encodeURIComponent(selectedRestaurant.name)}&sentiment=${sentiment}`
      );
    } catch (e: any) {
      setUploading(false);
      const msg = e?.message ?? e?.error_description ?? JSON.stringify(e) ?? 'Error desconocido';
      Alert.alert('Error al guardar', msg, [{ text: 'OK' }]);
    }
  }

  const isSubmitting = isPending || uploading;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fdf9f2' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            const hasData = selectedRestaurant || sentiment || note.trim() || addedDishes.length > 0 || photos.length > 0 || dishInputValue.trim().length > 0;
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
        keyboardShouldPersistTaps="always"
      >
        {/* RESTAURANTE */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>RESTAURANTE</Text>
          <View>
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
                    activeOpacity={0.7}
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
            <Text style={styles.sectionLabel}>¿QUÉ PEDISTE?</Text>
            <Text style={styles.optionalText}>Opcional</Text>
          </View>

          {selectedRestaurant ? (
            <>
              {/* Free-text input */}
              <View style={styles.dishInputRow}>
                <TextInput
                  ref={dishInputRef}
                  style={styles.dishFreeInput}
                  placeholder="Añade un plato..."
                  placeholderTextColor="#c1c8c2"
                  value={dishInputValue}
                  onChangeText={setDishInputValue}
                  returnKeyType="done"
                  onSubmitEditing={() => addDishToList(dishInputValue)}
                  blurOnSubmit={false}
                />
                {dishInputValue.trim().length > 0 && (
                  <TouchableOpacity
                    style={styles.dishAddBtn}
                    onPress={() => addDishToList(dishInputValue)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="add" size={20} color="#032417" />
                  </TouchableOpacity>
                )}
              </View>

              {/* List of added dishes */}
              {addedDishes.length > 0 && (
                <View style={styles.addedDishesSection}>
                  {addedDishes.map((d, i) => (
                    <View key={i} style={styles.addedDishRow}>
                      {/* Star toggle */}
                      <TouchableOpacity
                        style={[styles.starBtn, d.highlighted && styles.starBtnActive]}
                        onPress={() => toggleHighlight(i)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.starBtnText, d.highlighted && styles.starBtnTextActive]}>★</Text>
                      </TouchableOpacity>

                      <Text style={[styles.addedDishName, d.highlighted && styles.addedDishNameHighlighted]} numberOfLines={1}>
                        {d.name}
                      </Text>

                      {/* Photo thumbnail or camera button */}
                      {d.photo ? (
                        <TouchableOpacity
                          onPress={() => addDishPhoto(i)}
                          activeOpacity={0.8}
                          style={{ marginRight: 4 }}
                        >
                          <Image
                            source={{ uri: d.photo }}
                            style={{ width: 36, height: 36, borderRadius: 8 }}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={() => addDishPhoto(i)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.75}
                          style={{ marginRight: 4 }}
                        >
                          <MaterialIcons name="add-a-photo" size={18} color="#c1c8c2" />
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        onPress={() => removeDishFromList(i)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.75}
                      >
                        <MaterialIcons name="close" size={16} color="#c1c8c2" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <Text style={styles.dishNoRestaurantHint}>
              Selecciona primero un restaurante para añadir platos
            </Text>
          )}
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
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>

        {/* GASTO POR PERSONA */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>¿CUÁNTO GASTASTEIS POR PERSONA?</Text>
            <Text style={styles.optionalText}>Opcional</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['0-20', '20-35', '35-60', '60+'] as const).map((option) => {
              const active = spendPerPerson === option;
              const labels: Record<string, string> = {
                '0-20': '€0–20',
                '20-35': '€20–35',
                '35-60': '€35–60',
                '60+': '€60+',
              };
              return (
                <TouchableOpacity
                  key={option}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 11,
                    borderRadius: 999,
                    backgroundColor: active ? '#c7ef48' : '#ebe8e1',
                  }}
                  onPress={() => setSpendPerPerson(active ? null : option)}
                  activeOpacity={0.75}
                >
                  <Text style={{
                    fontFamily: 'NotoSerif-Bold',
                    fontSize: 15,
                    color: active ? '#546b00' : '#424844',
                  }}>
                    {labels[option]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ACOMPAÑANTES */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>ACOMPAÑANTES</Text>
            <Text style={styles.optionalText}>Opcional</Text>
          </View>

          {/* Handle input */}
          <View style={styles.searchBox}>
            <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 15, color: '#727973' }}>@</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="handle del acompañante"
              placeholderTextColor="#c1c8c2"
              value={handleInput}
              onChangeText={(v) => {
                const clean = v.replace(/^@/, '').toLowerCase();
                setHandleInput(clean);
                if (handleTimeout.current) clearTimeout(handleTimeout.current);
                if (clean.length < 2) { setHandleResults([]); return; }
                setHandleSearching(true);
                handleTimeout.current = setTimeout(async () => {
                  try {
                    const results = await searchUsers(clean);
                    setHandleResults(results.filter((u: any) => u.id !== currentUser?.id && !taggedUserIds.includes(u.id)));
                  } catch { /* silent */ } finally { setHandleSearching(false); }
                }, 350);
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {handleSearching && <ActivityIndicator size="small" color="#727973" />}
            {handleInput.length > 0 && !handleSearching && (
              <TouchableOpacity onPress={() => { setHandleInput(''); setHandleResults([]); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="close" size={16} color="#727973" />
              </TouchableOpacity>
            )}
          </View>

          {/* Search results dropdown */}
          {handleResults.length > 0 && (
            <View style={styles.dropdown}>
              {handleResults.slice(0, 5).map((u: any) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.dropdownItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    setTaggedUserIds((prev) => [...prev, u.id]);
                    setTaggedUsers((prev) => [...prev, { id: u.id, name: u.name, handle: u.handle, avatar_url: u.avatar_url }]);
                    setHandleInput('');
                    setHandleResults([]);
                  }}
                >
                  {u.avatar_url ? (
                    <Image source={{ uri: u.avatar_url }} style={styles.companionAvatar} />
                  ) : (
                    <View style={[styles.companionAvatar, { backgroundColor: '#e6e2db', alignItems: 'center', justifyContent: 'center' }]}>
                      <MaterialIcons name="person" size={12} color="#727973" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dropdownMain} numberOfLines={1}>{u.name}</Text>
                    {u.handle && <Text style={styles.dropdownSub}>@{u.handle}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Tagged companions chips */}
          {taggedUsers.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {taggedUsers.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.companionChipActive}
                  activeOpacity={0.75}
                  onPress={() => {
                    setTaggedUserIds((prev) => prev.filter((id) => id !== u.id));
                    setTaggedUsers((prev) => prev.filter((t) => t.id !== u.id));
                  }}
                >
                  {u.avatar_url ? (
                    <Image source={{ uri: u.avatar_url }} style={styles.companionAvatar} />
                  ) : (
                    <View style={[styles.companionAvatar, { backgroundColor: '#c7ef48', alignItems: 'center', justifyContent: 'center' }]}>
                      <MaterialIcons name="person" size={12} color="#032417" />
                    </View>
                  )}
                  <Text style={styles.companionNameActive} numberOfLines={1}>
                    {u.handle ? `@${u.handle}` : u.name}
                  </Text>
                  <MaterialIcons name="close" size={13} color="#546b00" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* CTA */}
        {/* Missing fields hint */}
        {(!selectedRestaurant || !sentiment) && (
          <View style={{ backgroundColor: '#f7f3ec', borderRadius: 12, padding: 12, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialIcons name="info-outline" size={16} color="#727973" />
            <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 13, color: '#727973', flex: 1 }}>
              {!selectedRestaurant ? 'Selecciona un restaurante para continuar.' : 'Elige cómo estuvo la visita.'}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.ctaBtn, (!sentiment || !selectedRestaurant || isSubmitting) && styles.ctaBtnDisabled]}
          activeOpacity={0.85}
          disabled={!sentiment || !selectedRestaurant || isSubmitting}
          onPress={handleSubmit}
        >
          {isSubmitting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={[styles.ctaBtnText, { color: '#ffffff' }]}>
                {uploading ? 'Subiendo fotos...' : 'Guardando...'}
              </Text>
            </View>
          ) : (
            <Text style={[styles.ctaBtnText, (!sentiment || !selectedRestaurant) && { color: '#727973' }]}>
              {!selectedRestaurant
                ? '— Selecciona restaurante —'
                : !sentiment
                ? '— Elige cómo estuvo —'
                : 'Guardar y ubicar en ranking →'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  existingRankBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#eaf3d0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  existingRankText: {
    flex: 1,
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#3a5000',
    lineHeight: 17,
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 6,
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
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
  // ── Dish input (v2: free text, no autocomplete) ───────────────────────────
  dishInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f3ec',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 2,
    gap: 4,
  },
  dishFreeInput: {
    flex: 1,
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#1c1c18',
    paddingVertical: 12,
  },
  dishAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#c7ef48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedDishesSection: {
    gap: 0,
    marginTop: 4,
  },
  addedDishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1ede6',
  },
  starBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1ede6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starBtnActive: {
    backgroundColor: '#c7ef48',
  },
  starBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#c1c8c2',
  },
  starBtnTextActive: {
    color: '#546b00',
  },
  addedDishName: {
    flex: 1,
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    color: '#1c1c18',
  },
  addedDishNameHighlighted: {
    fontFamily: 'Manrope-SemiBold',
    color: '#032417',
  },
  dishNoRestaurantHint: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#c1c8c2',
    textAlign: 'center',
    paddingVertical: 12,
  },
  // ── End dish input ─────────────────────────────────────────────────────────
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
  companionChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#e8f5c8',
    maxWidth: 200,
  },
  companionAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  companionName: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    color: '#424844',
    flexShrink: 1,
  },
  companionNameActive: {
    fontFamily: 'Manrope-Bold',
    color: '#032417',
  },
});
