import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useRef, useCallback } from 'react';
import { searchCities, type PlaceCandidate } from '../lib/api/places';

interface CityPickerProps {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CityPicker({
  value,
  onChange,
  placeholder = 'Buscar ciudad...',
  autoFocus,
}: CityPickerProps) {
  const [inputText, setInputText] = useState(value);
  const [suggestions, setSuggestions] = useState<PlaceCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCities = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchCities(text);
      setSuggestions(results);
      setLoading(false);
    }, 350);
  }, []);

  function handleChange(text: string) {
    setInputText(text);
    if (text.trim() === '') {
      onChange('');
      setSuggestions([]);
      setLoading(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    } else {
      fetchCities(text);
    }
  }

  function handleSelect(candidate: PlaceCandidate) {
    // Use main_text (city name only, e.g. "Madrid") — not the full description
    const cityName = candidate.structured_formatting?.main_text ?? candidate.description;
    setInputText(cityName);
    setSuggestions([]);
    setLoading(false);
    onChange(cityName);
  }

  function handleClear() {
    setInputText('');
    setSuggestions([]);
    setLoading(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onChange('');
  }

  return (
    <View style={s.wrapper}>
      <View style={s.inputRow}>
        <MaterialIcons name="location-on" size={18} color="#727973" />
        <TextInput
          style={s.input}
          value={inputText}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor="#c1c8c2"
          autoCorrect={false}
          autoCapitalize="words"
          autoFocus={autoFocus}
          onBlur={() => {
            // Small delay so tap on suggestion registers before blur hides dropdown
            setTimeout(() => setSuggestions([]), 200);
          }}
        />
        {loading ? (
          <ActivityIndicator size="small" color="#727973" style={{ paddingHorizontal: 4 }} />
        ) : inputText.length > 0 ? (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="close" size={18} color="#727973" />
          </TouchableOpacity>
        ) : null}
      </View>

      {suggestions.length > 0 && (
        <View style={s.dropdown}>
          {suggestions.map((c) => (
            <TouchableOpacity
              key={c.place_id}
              style={s.suggestion}
              onPress={() => handleSelect(c)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="place" size={16} color="#516600" />
              <View style={{ flex: 1 }}>
                <Text style={s.suggestionMain}>
                  {c.structured_formatting?.main_text ?? c.description}
                </Text>
                {c.structured_formatting?.secondary_text ? (
                  <Text style={s.suggestionSub} numberOfLines={1}>
                    {c.structured_formatting.secondary_text}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { position: 'relative', zIndex: 20 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f1ede6',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#1c1c18',
  },
  dropdown: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 100,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  suggestionMain: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    color: '#1c1c18',
  },
  suggestionSub: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#727973',
    marginTop: 1,
  },
});
