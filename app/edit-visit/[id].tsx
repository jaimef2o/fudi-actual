import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Image,
  Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { showAlert } from '../../lib/utils/alerts';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { useVisit } from '../../lib/hooks/useVisit';
import { useVisitDishes } from '../../lib/hooks/useDishes';
import { useUpdateVisitFull } from '../../lib/hooks/useVisit';
import { useAppStore } from '../../store';
import { pickImage, compressAndUpload } from '../../lib/storage';
import { getDisplayName } from '../../lib/utils/restaurantName';

const SENTIMENTS = [
  { key: 'loved' as const, icon: 'favorite' as const, label: 'Me encantó', color: '#c7ef48', textColor: '#032417', iconColor: '#032417' },
  { key: 'fine' as const, icon: 'thumb-up' as const, label: 'Estuvo bien', color: '#fde8a0', textColor: '#6b4f00', iconColor: '#6b4f00' },
  { key: 'disliked' as const, icon: 'thumb-down' as const, label: 'No me convenció', color: '#fdd5c8', textColor: '#7a2020', iconColor: '#7a2020' },
];

type EditDish = { name: string; highlighted: boolean; photo: string | null };

export default function EditVisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);

  const { data: visit, isLoading: visitLoading } = useVisit(id);
  const { data: visitDishesRaw = [] } = useVisitDishes(id);
  const { mutateAsync: updateVisitFull, isPending: isSaving } = useUpdateVisitFull();

  // Form state
  const [sentiment, setSentiment] = useState<'loved' | 'fine' | 'disliked'>('loved');
  const [note, setNote] = useState('');
  const [spendPerPerson, setSpendPerPerson] = useState<'0-20' | '20-35' | '35-60' | '60+' | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'groups' | 'private'>('friends');
  const [dishes, setDishes] = useState<EditDish[]>([]);
  const [dishInput, setDishInput] = useState('');
  const dishInputRef = useRef<any>(null);

  // Existing restaurant photos (shown, can be removed)
  const [existingPhotos, setExistingPhotos] = useState<{ id: string; url: string }[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);
  // New photos to upload
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const initialized = useRef(false);

  // Pre-fill form when visit data loads
  useEffect(() => {
    if (!visit || initialized.current) return;
    initialized.current = true;
    setSentiment((visit as any).sentiment ?? 'loved');
    setNote((visit as any).note ?? '');
    setSpendPerPerson((visit as any).spend_per_person ?? null);
    setVisibility((visit as any).visibility ?? 'friends');
    const restaurantPhotos = ((visit as any).photos ?? []).filter((p: any) => p.type === 'restaurant' || !p.dish_id);
    setExistingPhotos(restaurantPhotos.map((p: any) => ({ id: p.id, url: p.photo_url })));
  }, [visit]);

  useEffect(() => {
    if (!visitDishesRaw || visitDishesRaw.length === 0 || initialized.current) return;
    // dishes hook runs independently so pre-fill once
    setDishes(
      (visitDishesRaw as any[]).map((d) => ({
        name: d.name ?? d.dish_name ?? '',
        highlighted: d.highlighted ?? false,
        photo: null,
      }))
    );
  }, [visitDishesRaw]);

  const visitRestaurant = (visit as any)?.restaurant;
  const restaurantName = visitRestaurant ? getDisplayName(visitRestaurant, 'detail') : '—';
  const isOwnPost = !!currentUser?.id && (visit as any)?.user_id === currentUser.id;

  function addDish(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (dishes.some((d) => d.name.toLowerCase() === trimmed.toLowerCase())) return;
    setDishes((prev) => [...prev, { name: trimmed, highlighted: false, photo: null }]);
    setDishInput('');
    dishInputRef.current?.focus();
  }

  function toggleHighlight(i: number) {
    setDishes((prev) => prev.map((d, idx) => idx === i ? { ...d, highlighted: !d.highlighted } : d));
  }

  function removeDish(i: number) {
    setDishes((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function addDishPhoto(i: number) {
    const uri = await pickImage({ aspect: [1, 1], allowsEditing: true, quality: 0.8 });
    if (uri) {
      setDishes((prev) => prev.map((d, idx) => idx === i ? { ...d, photo: uri } : d));
    }
  }

  function removeExistingPhoto(photoId: string) {
    setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setRemovedPhotoIds((prev) => [...prev, photoId]);
  }

  async function addNewPhoto() {
    const totalPhotos = existingPhotos.length + newPhotos.length;
    if (totalPhotos >= 5) {
      showAlert('Máximo de fotos', 'Puedes tener hasta 5 fotos por visita.');
      return;
    }
    const uri = await pickImage({ aspect: [4, 3], allowsEditing: true, quality: 0.8 });
    if (uri) setNewPhotos((prev) => [...prev, uri]);
  }

  async function handleSave() {
    if (!id || !currentUser?.id || !isOwnPost) return;
    Keyboard.dismiss();

    // Flush pending dish input
    const pending = dishInput.trim();
    let finalDishes = dishes;
    if (pending && !dishes.some((d) => d.name.toLowerCase() === pending.toLowerCase())) {
      finalDishes = [...dishes, { name: pending, highlighted: false, photo: null }];
      setDishes(finalDishes);
      setDishInput('');
    }

    try {
      setUploading(true);
      const ts = Date.now();

      // Upload new restaurant photos
      const uploadedRestaurantUrls: string[] = [];
      for (let i = 0; i < newPhotos.length; i++) {
        const url = await compressAndUpload(newPhotos[i], `visits/${currentUser.id}/${ts}_r${i}.jpg`);
        uploadedRestaurantUrls.push(url);
      }

      // Upload new dish photos
      const dishPhotoUrls: { dish_index: number; photo_url: string }[] = [];
      for (let i = 0; i < finalDishes.length; i++) {
        if (finalDishes[i].photo) {
          const url = await compressAndUpload(finalDishes[i].photo!, `visits/${currentUser.id}/${ts}_d${i}.jpg`);
          dishPhotoUrls.push({ dish_index: i, photo_url: url });
        }
      }

      setUploading(false);

      await updateVisitFull({
        visitId: id,
        userId: currentUser.id,
        input: {
          sentiment,
          note: note.trim() || null,
          spend_per_person: spendPerPerson,
          visibility,
          dishes: finalDishes.map((d, i) => ({ name: d.name, highlighted: d.highlighted, position: i })),
          new_restaurant_photo_urls: uploadedRestaurantUrls,
          removed_photo_ids: removedPhotoIds,
          dish_photo_urls: dishPhotoUrls,
        },
      });

      showToast('Publicación actualizada');
      router.back();
    } catch (e: any) {
      setUploading(false);
      showAlert('Error', e?.message ?? 'No se pudo guardar. Inténtalo de nuevo.');
    }
  }

  const isSubmitting = isSaving || uploading;

  if (visitLoading || !visit) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fdf9f2', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#727973" />
      </View>
    );
  }

  if (!isOwnPost) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fdf9f2', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 15, color: '#727973', textAlign: 'center' }}>
          Solo puedes editar tus propias publicaciones.
        </Text>
      </View>
    );
  }

  const totalPhotoCount = existingPhotos.length + newPhotos.length;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fdf9f2' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.headerBtn}
          onPress={() => {
            showAlert(
              'Descartar cambios',
              '¿Seguro que quieres salir sin guardar?',
              [
                { text: 'Seguir editando', style: 'cancel' },
                { text: 'Descartar', style: 'destructive', onPress: () => router.back() },
              ]
            );
          }}
        >
          <MaterialIcons name="close" size={24} color="#032417" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Editar publicación</Text>
        <TouchableOpacity
          style={[s.saveBtn, isSubmitting && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#546b00" />
          ) : (
            <Text style={s.saveBtnText}>Guardar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Restaurant (locked) */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>RESTAURANTE</Text>
          <View style={s.restaurantLocked}>
            <MaterialIcons name="restaurant" size={18} color="#546b00" />
            <Text style={s.restaurantLockedText} numberOfLines={1}>{restaurantName}</Text>
            <MaterialIcons name="lock" size={14} color="#c1c8c2" />
          </View>
        </View>

        {/* Sentiment */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>¿CÓMO ESTUVO?</Text>
          <View style={s.sentimentRow}>
            {SENTIMENTS.map((sv) => (
              <TouchableOpacity
                key={sv.key}
                style={[s.sentimentBtn, sentiment === sv.key && { backgroundColor: sv.color, borderColor: sv.color }]}
                onPress={() => setSentiment(sv.key)}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={sv.icon}
                  size={26}
                  color={sentiment === sv.key ? sv.iconColor : '#727973'}
                />
                <Text style={[s.sentimentLabel, sentiment === sv.key && { color: sv.textColor, fontFamily: 'Manrope-Bold' }]}>
                  {sv.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Photos */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionLabel}>FOTOS</Text>
            <Text style={s.optionalText}>Opcional · {totalPhotoCount}/5</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.photosRow}>
            {/* Existing photos */}
            {existingPhotos.map((p) => (
              <View key={p.id} style={s.photoThumb}>
                <Image source={{ uri: p.url }} style={s.photoThumbImg} />
                <TouchableOpacity
                  style={s.photoRemoveBtn}
                  onPress={() => removeExistingPhoto(p.id)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <MaterialIcons name="cancel" size={20} color="#032417" />
                </TouchableOpacity>
              </View>
            ))}
            {/* New photos */}
            {newPhotos.map((uri, i) => (
              <View key={`new_${i}`} style={s.photoThumb}>
                <Image source={{ uri }} style={s.photoThumbImg} />
                <TouchableOpacity
                  style={s.photoRemoveBtn}
                  onPress={() => setNewPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <MaterialIcons name="cancel" size={20} color="#032417" />
                </TouchableOpacity>
              </View>
            ))}
            {totalPhotoCount < 5 && (
              <TouchableOpacity style={s.addPhotoBtn} onPress={addNewPhoto} activeOpacity={0.75}>
                <MaterialIcons name="add-a-photo" size={24} color="#727973" />
                <Text style={s.addPhotoText}>Añadir{'\n'}foto</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Dishes */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionLabel}>¿QUÉ PEDISTE?</Text>
            <Text style={s.optionalText}>Opcional</Text>
          </View>
          <View style={s.dishInputRow}>
            <TextInput
              ref={dishInputRef}
              style={s.dishFreeInput}
              placeholder="Añade un plato..."
              placeholderTextColor="#c1c8c2"
              value={dishInput}
              onChangeText={setDishInput}
              returnKeyType="done"
              onSubmitEditing={() => addDish(dishInput)}
              blurOnSubmit={false}
            />
            {dishInput.trim().length > 0 && (
              <TouchableOpacity style={s.dishAddBtn} onPress={() => addDish(dishInput)} activeOpacity={0.8}>
                <MaterialIcons name="add" size={20} color="#032417" />
              </TouchableOpacity>
            )}
          </View>

          {dishes.length > 0 && (
            <View style={s.addedDishesSection}>
              {dishes.map((d, i) => (
                <View key={i} style={s.addedDishRow}>
                  <TouchableOpacity
                    style={[s.starBtn, d.highlighted && s.starBtnActive]}
                    onPress={() => toggleHighlight(i)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.75}
                  >
                    <MaterialIcons
                      name={d.highlighted ? 'star' : 'star-border'}
                      size={18}
                      color={d.highlighted ? '#546b00' : '#c1c8c2'}
                    />
                  </TouchableOpacity>

                  <Text style={[s.addedDishName, d.highlighted && s.addedDishNameHighlighted]} numberOfLines={1}>
                    {d.name}
                  </Text>

                  {/* Per-dish photo */}
                  {d.photo ? (
                    <TouchableOpacity onPress={() => addDishPhoto(i)} activeOpacity={0.8} style={{ marginRight: 4 }}>
                      <Image source={{ uri: d.photo }} style={{ width: 36, height: 36, borderRadius: 8 }} resizeMode="cover" />
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
                    onPress={() => removeDish(i)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.75}
                  >
                    <MaterialIcons name="close" size={16} color="#c1c8c2" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Note */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionLabel}>NOTA</Text>
            <Text style={s.optionalText}>Opcional</Text>
          </View>
          <TextInput
            style={s.noteInput}
            placeholder="Cuenta tu opinión personal..."
            placeholderTextColor="#c1c8c2"
            multiline
            numberOfLines={4}
            value={note}
            onChangeText={setNote}
            textAlignVertical="top"
            maxLength={280}
          />
          <Text style={s.charCount}>{note.length}/280</Text>
        </View>

        {/* Spend per person */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionLabel}>¿CUÁNTO GASTASTEIS POR PERSONA?</Text>
            <Text style={s.optionalText}>Opcional</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['0-20', '20-35', '35-60', '60+'] as const).map((option) => {
              const active = spendPerPerson === option;
              const labels: Record<string, string> = { '0-20': '€0–20', '20-35': '€20–35', '35-60': '€35–60', '60+': '€60+' };
              return (
                <TouchableOpacity
                  key={option}
                  style={{ paddingHorizontal: 20, paddingVertical: 11, borderRadius: 999, backgroundColor: active ? '#c7ef48' : '#ebe8e1' }}
                  onPress={() => setSpendPerPerson(active ? null : option)}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 15, color: active ? '#546b00' : '#424844' }}>
                    {labels[option]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Visibility */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>VISIBILIDAD</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([
              { key: 'public' as const, label: 'Público', icon: 'public' as const },
              { key: 'friends' as const, label: 'Amigos', icon: 'group' as const },
              { key: 'private' as const, label: 'Solo yo', icon: 'lock' as const },
            ]).map((v) => {
              const active = visibility === v.key;
              return (
                <TouchableOpacity
                  key={v.key}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: active ? '#032417' : '#ebe8e1' }}
                  onPress={() => setVisibility(v.key)}
                  activeOpacity={0.75}
                >
                  <MaterialIcons name={v.icon} size={16} color={active ? '#c7ef48' : '#727973'} />
                  <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 13, color: active ? '#c7ef48' : '#727973' }}>
                    {v.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
    backgroundColor: '#fdf9f2',
    borderBottomWidth: 1,
    borderBottomColor: '#f1ede6',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 18,
    color: '#032417',
  },
  saveBtn: {
    backgroundColor: '#c7ef48',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#546b00',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 4,
  },
  section: {
    marginBottom: 24,
    gap: 12,
  },
  sectionLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#727973',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionalText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: '#c1c8c2',
  },
  restaurantLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f1ede6',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  restaurantLockedText: {
    flex: 1,
    fontFamily: 'Manrope-SemiBold',
    fontSize: 15,
    color: '#1c1c18',
  },
  sentimentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sentimentBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#f1ede6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sentimentLabel: {
    fontFamily: 'Manrope-Medium',
    fontSize: 11,
    color: '#727973',
    textAlign: 'center',
  },
  photosRow: {
    gap: 10,
    paddingVertical: 4,
  },
  photoThumb: {
    position: 'relative',
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: 'visible',
  },
  photoThumbImg: {
    width: 88,
    height: 88,
    borderRadius: 12,
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fdf9f2',
    borderRadius: 10,
  },
  addPhotoBtn: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: '#f1ede6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 10,
    color: '#727973',
    textAlign: 'center',
  },
  dishInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f3ec',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 8,
  },
  dishFreeInput: {
    flex: 1,
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: '#1c1c18',
    paddingVertical: 14,
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
    gap: 2,
  },
  addedDishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f7f3ec',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  starBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ebe8e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starBtnActive: {
    backgroundColor: '#e8f5c8',
  },
  addedDishName: {
    flex: 1,
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    color: '#1c1c18',
  },
  addedDishNameHighlighted: {
    fontFamily: 'Manrope-Bold',
    color: '#032417',
  },
  noteInput: {
    backgroundColor: '#f7f3ec',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: '#1c1c18',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: '#c1c8c2',
    textAlign: 'right',
    marginTop: -8,
  },
});
