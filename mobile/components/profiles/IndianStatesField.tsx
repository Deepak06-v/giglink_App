import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Input, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { INDIAN_STATES_AND_UTS } from '@/lib/constants/indianStates';

const MAX_SUGGESTIONS = 6;

interface IndianStatesFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function IndianStatesField({
  label,
  value,
  onChange,
  placeholder,
}: IndianStatesFieldProps) {
  const [query, setQuery] = useState(value);
  const [focused, setFocused] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }
    return INDIAN_STATES_AND_UTS.filter(
      (state) => state.toLowerCase().startsWith(q) || state.toLowerCase().includes(q),
    ).slice(0, MAX_SUGGESTIONS);
  }, [query]);

  const showSuggestions = focused && matches.length > 0;

  const select = (state: string) => {
    onChange(state);
    setQuery(state);
    setFocused(false);
  };

  return (
    <View style={styles.wrapper}>
      <Input
        label={label}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          onChange(text);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
      />
      {showSuggestions ? (
        <View style={styles.dropdown}>
          {matches.map((state) => (
            <Pressable
              key={state}
              onPressIn={() => select(state)}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            >
              <Text variant="bodyMd" color="primary">
                {state}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionPressed: {
    opacity: 0.92,
  },
});