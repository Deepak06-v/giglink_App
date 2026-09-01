import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import type { ViewToken } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, Megaphone, Search, Users } from '@/components/icons';
import type { LucideIcon } from '@/components/icons';
import { Button, Text } from '@/components/ui';
import { colors, radius, sizes, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';
import { useAuthStore } from '@/store/authStore';
import { markOnboardingCompleted, resolvePostAuthRoute } from '@/utils/onboarding';

interface Slide {
  key: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: LucideIcon;
}

const SLIDES: Slide[] = [
  {
    key: 'discover',
    titleKey: 'onboarding.slide1Title',
    descriptionKey: 'onboarding.slide1Description',
    icon: Search,
  },
  {
    key: 'post',
    titleKey: 'onboarding.slide2Title',
    descriptionKey: 'onboarding.slide2Description',
    icon: Megaphone,
  },
  {
    key: 'connect',
    titleKey: 'onboarding.slide3Title',
    descriptionKey: 'onboarding.slide3Description',
    icon: Users,
  },
  {
    key: 'get-done',
    titleKey: 'onboarding.slide4Title',
    descriptionKey: 'onboarding.slide4Description',
    icon: CheckCircle2,
  },
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const isLast = index === SLIDES.length - 1;

  const goTo = useCallback((nextIndex: number) => {
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setIndex(nextIndex);
  }, []);

  const finish = async () => {
    const user = useAuthStore.getState().user;
    if (user) {
      await markOnboardingCompleted(user.id);
    }
    const route = await resolvePostAuthRoute(user ?? { id: '', role: 'worker' });
    router.replace(route);
  };

  const handleNext = () => {
    if (isLast) {
      void finish();
    } else {
      goTo(index + 1);
    }
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const v = viewableItems[0];
      if (v && typeof v.index === 'number') {
        setIndex(v.index);
      }
    },
  ).current;

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
    setIndex(Math.max(0, Math.min(next, SLIDES.length - 1)));
  };

  const renderSlide = ({ item, index: itemIndex }: { item: Slide; index: number }) => {
    const Icon = item.icon;
    const isCurrent = itemIndex === index;
    return (
      <View style={[styles.slide, { width }]} accessibilityElementsHidden={!isCurrent}>
        <View style={styles.artwork}>
          <View style={styles.iconHalo}>
            <Icon size={40} color={colors.accent.opportunity} />
          </View>
        </View>
        <Text variant="headingXl" color="primary" align="center" style={styles.title}>
          {t(item.titleKey)}
        </Text>
        <Text variant="bodyLg" color="secondary" align="center" style={styles.description}>
          {t(item.descriptionKey)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => void finish()}
          hitSlop={8}
          style={styles.skipButton}
        >
          <Text variant="label" color="secondary">
            {t('onboarding.skip')}
          </Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={renderSlide}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      />

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.pagination}>
          {SLIDES.map((slide, i) => (
            <Pressable
              key={slide.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: i === index }}
              accessibilityLabel={t(slide.titleKey)}
              onPress={() => goTo(i)}
              hitSlop={6}
              style={styles.dotHit}
            >
              <View style={[styles.dot, i === index && styles.dotActive]} />
            </Pressable>
          ))}
        </View>

        <Button
          label={isLast ? t('onboarding.getStarted') : t('onboarding.next')}
          onPress={handleNext}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    minHeight: sizes.touchTarget,
    alignItems: 'flex-start',
  },
  skipButton: {
    marginTop: spacing.xs,
  },
  slide: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  artwork: {
    alignItems: 'center',
  },
  iconHalo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accent.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
  },
  bottom: {
    paddingHorizontal: sizes.screenPaddingHorizontal,
    paddingTop: spacing.md,
    gap: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dotHit: {
    padding: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.text.muted,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.accent.opportunity,
  },
});
