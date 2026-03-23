import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';

// Mock city list — replace with Google Places API call when ready
const MOCK_CITIES = [
  'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'San Sebastián',
  'Málaga', 'Zaragoza', 'Murcia', 'Palma', 'Las Palmas', 'Alicante',
  'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'Granada', 'Pamplona',
  'Santander', 'Burgos', 'Salamanca', 'Toledo', 'Cádiz', 'Logroño',
  'París', 'Londres', 'Roma', 'Milán', 'Lisboa', 'Oporto',
  'Berlín', 'Amsterdam', 'Bruselas', 'Viena', 'Praga', 'Budapest',
  'Nueva York', 'Los Ángeles', 'Chicago', 'Miami', 'Ciudad de México',
  'Buenos Aires', 'Bogotá', 'Lima', 'Santiago', 'São Paulo', 'Río de Janeiro',
  'Tokio', 'Bangkok', 'Singapur', 'Seúl', 'Pekín', 'Shanghái',
  'Dubái', 'Estambul', 'Marrakech', 'El Cairo', 'Lagos',
  'Sydney', 'Melbourne', 'Auckland',
];

interface CityPickerProps {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CityPicker({ value, onChange, placeholder = 'Buscar ciudad...', autoFocus }: CityPickerProps) {
  const [inputText, setInputText] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  function handleChange(text: string) {
    setInputText(text);
    if (text.trim().length >= 2) {
      const filtered = MOCK_CITIES.filter((c) =>
        c.toLowerCase().includes(text.trim().toLowerCase())
      ).slice(0, 6);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
    if (text.trim() === '') onChange('');
  }

  function handleSelect(city: string) {
    setInputText(city);
    setSuggestions([]);
    onChange(city);
  }

  function handleClear() {
    setInputText('');
    setSuggestions([]);
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
          onBlur={() => setTimeout(() => { setSuggestions([]); }, 150)}
        />
        {inputText.length > 0 && (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="close" size={18} color="#727973" />
          </TouchableOpacity>
        )}
      </View>
      {suggestions.length > 0 && (
        <View style={s.dropdown}>
          {suggestions.map((city) => (
            <TouchableOpacity
              key={city}
              style={s.suggestion}
              onPress={() => handleSelect(city)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="place" size={16} color="#727973" />
              <Text style={s.suggestionText}>{city}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { position: 'relative', zIndex: 10 },
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
    elevation: 8,
    overflow: 'hidden',
    zIndex: 100,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  suggestionText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    color: '#1c1c18',
  },
});
