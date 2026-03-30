import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Linking,
  Modal,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { showAlert } from '../lib/utils/alerts';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { useProfile, useUpdateProfile } from '../lib/hooks/useProfile';
import { supabase } from '../lib/supabase';
import { searchCities, type PlaceCandidate } from '../lib/api/places';

// ── APP VERSION ───────────────────────────────────────────────────────────────
const APP_VERSION = '1.0.0 (MVP)';

// ── DEFAULT VISIBILITY ────────────────────────────────────────────────────────
const VISIBILITY_OPTIONS: { key: 'friends' | 'private'; label: string; icon: string }[] = [
  { key: 'friends', label: 'Amigos', icon: 'group' },
  { key: 'private', label: 'Solo yo', icon: 'lock' },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <Text style={styles.sectionHeader}>{label}</Text>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  destructive = false,
  showChevron = true,
  rightComponent,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  rightComponent?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !rightComponent}
    >
      <View style={[styles.rowIcon, destructive && { backgroundColor: 'rgba(186,26,26,0.08)' }]}>
        <MaterialIcons
          name={icon as any}
          size={18}
          color={destructive ? '#ba1a1a' : '#424844'}
        />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[styles.rowLabel, destructive && { color: '#ba1a1a' }]}>{label}</Text>
        {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
      </View>
      {rightComponent ?? (
        showChevron && onPress ? (
          <MaterialIcons name="chevron-right" size={20} color="#c1c8c2" />
        ) : null
      )}
    </TouchableOpacity>
  );
}

// ── EDIT MODAL ────────────────────────────────────────────────────────────────
function EditModal({
  visible,
  title,
  value,
  placeholder,
  multiline,
  onClose,
  onSave,
  saving,
}: {
  visible: boolean;
  title: string;
  value: string;
  placeholder: string;
  multiline?: boolean;
  onClose: () => void;
  onSave: (val: string) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (visible) setDraft(value); }, [visible, value]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={() => onSave(draft.trim())} disabled={saving} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {saving
                ? <ActivityIndicator size="small" color="#032417" />
                : <Text style={[styles.modalSave, !draft.trim() && { opacity: 0.4 }]}>Guardar</Text>
              }
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.modalInput, multiline && { height: 96, textAlignVertical: 'top' }]}
            value={draft}
            onChangeText={setDraft}
            placeholder={placeholder}
            placeholderTextColor="#c1c8c2"
            multiline={multiline}
            autoFocus
            returnKeyType={multiline ? 'default' : 'done'}
            onSubmitEditing={() => !multiline && onSave(draft.trim())}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── CITY PICKER MODAL ─────────────────────────────────────────────────────────
function CityModal({
  visible,
  current,
  onClose,
  onSave,
  saving,
}: {
  visible: boolean;
  current: string;
  onClose: () => void;
  onSave: (city: string) => void;
  saving: boolean;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceCandidate[]>([]);
  const [selected, setSelected] = useState(current);
  const searchTimeout = { current: null as ReturnType<typeof setTimeout> | null };

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setSelected(current);
    setSuggestions([]);
  }, [visible, current]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim() || query.length < 2) { setSuggestions([]); return; }
    searchTimeout.current = setTimeout(async () => {
      const results = await searchCities(query);
      setSuggestions(results);
    }, 350);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalSheet, { maxHeight: '75%' }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ciudad</Text>
            <TouchableOpacity onPress={() => onSave(selected)} disabled={saving || !selected}>
              {saving
                ? <ActivityIndicator size="small" color="#032417" />
                : <Text style={[styles.modalSave, !selected && { opacity: 0.4 }]}>Guardar</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Search input */}
          <View style={styles.citySearchBox}>
            <MaterialIcons name="search" size={18} color="#727973" />
            <TextInput
              style={styles.citySearchInput}
              placeholder="Buscar ciudad..."
              placeholderTextColor="#c1c8c2"
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); setSuggestions([]); }}>
                <MaterialIcons name="close" size={16} color="#727973" />
              </TouchableOpacity>
            )}
          </View>

          {/* Selected badge */}
          {selected && !query && (
            <View style={styles.citySelectedBadge}>
              <MaterialIcons name="location-on" size={14} color="#546b00" />
              <Text style={styles.citySelectedText}>{selected}</Text>
              <TouchableOpacity onPress={() => setSelected('')}>
                <MaterialIcons name="close" size={14} color="#546b00" />
              </TouchableOpacity>
            </View>
          )}

          {/* Suggestions */}
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 280 }}>
            {suggestions.map((s) => (
              <TouchableOpacity
                key={s.place_id}
                style={styles.citySuggestionRow}
                onPress={() => {
                  const cityName = s.structured_formatting.main_text;
                  setSelected(cityName);
                  setQuery('');
                  setSuggestions([]);
                }}
                activeOpacity={0.75}
              >
                <MaterialIcons name="location-city" size={16} color="#727973" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cityMain}>{s.structured_formatting.main_text}</Text>
                  <Text style={styles.citySub}>{s.structured_formatting.secondary_text}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const { data: profile, isLoading } = useProfile(currentUser?.id);
  const { mutateAsync: updateProfile, isPending: saving } = useUpdateProfile(currentUser?.id ?? '');

  // Modal state
  const [editModal, setEditModal] = useState<null | { field: 'name' | 'bio'; value: string }>(null);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [savingField, setSavingField] = useState(false);

  // Local prefs (stored client-side for MVP — no extra DB column needed)
  const [defaultVisibility, setDefaultVisibility] = useState<'friends' | 'private'>('friends');

  // Email from Supabase auth (not from users table)
  const [authEmail, setAuthEmail] = useState<string>('');
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthEmail(data.user?.email ?? data.user?.phone ?? '');
    });
  }, []);

  async function saveField(field: 'name' | 'bio', value: string) {
    setSavingField(true);
    try {
      await updateProfile({ [field]: value });
      setEditModal(null);
    } catch {
      showAlert('Error', 'No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setSavingField(false);
    }
  }

  async function saveCity(city: string) {
    setSavingField(true);
    try {
      await updateProfile({ city });
      setCityModalOpen(false);
    } catch {
      showAlert('Error', 'No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setSavingField(false);
    }
  }

  async function handleLogout() {
    async function doLogout() {
      try {
        await supabase.auth.signOut();
      } catch {
        showAlert('Error', 'No se pudo cerrar sesión. Inténtalo de nuevo.');
      }
    }

    showAlert(
      'Cerrar sesión',
      '¿Seguro que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: doLogout },
      ]
    );
  }

  async function handleDeleteAccount() {
    showAlert(
      'Eliminar cuenta',
      'Esta acción es permanente y no se puede deshacer. Todos tus datos serán eliminados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar cuenta',
          style: 'destructive',
          onPress: () => {
            showAlert('Próximamente', 'Para eliminar tu cuenta, escríbenos a hola@fudi.app y lo gestionamos de inmediato.');
          },
        },
      ]
    );
  }

  const profileName = (profile as any)?.name ?? currentUser?.name ?? '';
  const profileBio = (profile as any)?.bio ?? '';
  const profileCity = (profile as any)?.city ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#032417" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajustes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#032417" style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* ── PERFIL ── */}
            <SectionHeader label="PERFIL" />
            <View style={styles.card}>
              <SettingsRow
                icon="person"
                label="Nombre"
                value={profileName || '—'}
                onPress={() => setEditModal({ field: 'name', value: profileName })}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="edit-note"
                label="Bio"
                value={profileBio || 'Añadir bio...'}
                onPress={() => setEditModal({ field: 'bio', value: profileBio })}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="location-city"
                label="Ciudad"
                value={profileCity || 'Añadir ciudad...'}
                onPress={() => setCityModalOpen(true)}
              />
            </View>

            {/* ── CUENTA ── */}
            <SectionHeader label="CUENTA" />
            <View style={styles.card}>
              <SettingsRow
                icon="alternate-email"
                label="Email / teléfono"
                value={authEmail || '—'}
                showChevron={false}
              />
            </View>

            {/* ── PREFERENCIAS ── */}
            <SectionHeader label="PREFERENCIAS" />
            <View style={styles.card}>
              {/* Default visibility */}
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <MaterialIcons name="visibility" size={18} color="#424844" />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.rowLabel}>Visibilidad por defecto</Text>
                  <View style={styles.visibilityRow}>
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.key}
                        style={[styles.visibilityChip, defaultVisibility === opt.key && styles.visibilityChipActive]}
                        onPress={() => setDefaultVisibility(opt.key)}
                        activeOpacity={0.75}
                      >
                        <MaterialIcons
                          name={opt.icon as any}
                          size={13}
                          color={defaultVisibility === opt.key ? '#546b00' : '#727973'}
                        />
                        <Text style={[styles.visibilityChipText, defaultVisibility === opt.key && styles.visibilityChipTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* ── SOPORTE ── */}
            <SectionHeader label="SOPORTE" />
            <View style={styles.card}>
              <SettingsRow
                icon="mail-outline"
                label="Contactar con el equipo"
                value="hola@fudi.app"
                onPress={() => Linking.openURL('mailto:hola@fudi.app?subject=fudi%20feedback')}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="policy"
                label="Política de privacidad"
                onPress={() => Linking.openURL('https://fudi.app/privacy')}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="description"
                label="Términos de uso"
                onPress={() => Linking.openURL('https://fudi.app/terms')}
              />
            </View>

            {/* ── APP ── */}
            <SectionHeader label="APP" />
            <View style={styles.card}>
              <SettingsRow
                icon="info-outline"
                label="Versión"
                value={APP_VERSION}
                showChevron={false}
              />
            </View>

            {/* ── SESIÓN ── */}
            <SectionHeader label="SESIÓN" />
            <View style={styles.card}>
              <SettingsRow
                icon="logout"
                label="Cerrar sesión"
                onPress={handleLogout}
                destructive
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="delete-forever"
                label="Eliminar cuenta"
                onPress={handleDeleteAccount}
                destructive
              />
            </View>

            <View style={{ height: 60 }} />
          </>
        )}
      </ScrollView>

      {/* Edit name / bio modal */}
      {editModal && (
        <EditModal
          visible
          title={editModal.field === 'name' ? 'Nombre' : 'Bio'}
          value={editModal.value}
          placeholder={editModal.field === 'name' ? 'Tu nombre...' : 'Cuéntanos algo de ti...'}
          multiline={editModal.field === 'bio'}
          onClose={() => setEditModal(null)}
          onSave={(val) => saveField(editModal.field, val)}
          saving={savingField}
        />
      )}

      {/* City picker modal */}
      <CityModal
        visible={cityModalOpen}
        current={profileCity}
        onClose={() => setCityModalOpen(false)}
        onSave={saveCity}
        saving={savingField}
      />
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    height: Platform.OS === 'ios' ? 108 : 88,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(253,249,242,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  headerTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 18,
    color: '#032417',
  },
  scroll: {
    paddingTop: Platform.OS === 'ios' ? 124 : 104,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // Section header
  sectionHeader: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#727973',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 28,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f1ede6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 15,
    color: '#032417',
  },
  rowValue: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#727973',
    marginTop: 1,
  },
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(193,200,194,0.18)',
    marginLeft: 62,
  },

  // Visibility toggle
  visibilityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  visibilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f1ede6',
  },
  visibilityChipActive: {
    backgroundColor: '#c7ef48',
  },
  visibilityChipText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: '#727973',
  },
  visibilityChipTextActive: {
    color: '#546b00',
  },

  // Edit modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3,36,23,0.25)',
  },
  modalSheet: {
    backgroundColor: '#fdf9f2',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 48 : 28,
    paddingTop: 12,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#c1c8c2',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 17,
    color: '#032417',
  },
  modalCancel: {
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: '#727973',
  },
  modalSave: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#032417',
  },
  modalInput: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: '#1c1c18',
    borderWidth: 1,
    borderColor: 'rgba(193,200,194,0.3)',
  },

  // City modal
  citySearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(193,200,194,0.3)',
    marginBottom: 12,
  },
  citySearchInput: {
    flex: 1,
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: '#1c1c18',
  },
  citySelectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#c7ef48',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  citySelectedText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: '#546b00',
    flex: 1,
  },
  citySuggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  cityMain: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    color: '#032417',
  },
  citySub: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#727973',
    marginTop: 1,
  },
});
