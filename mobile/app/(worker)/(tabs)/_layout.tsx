import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Briefcase, ClipboardList, FileText, User } from '@/components/icons';
import { useFontFamily } from '@/constants/fonts';
import { colors, radius, sizes, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';

export default function WorkerTabsLayout() {
  const { t } = useTranslation();
  const fontFamily = useFontFamily(500);
  const insets = useSafeAreaInsets();

  const dynamicTabBarHeight = sizes.tabBarHeight + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: colors.background.primary,
          paddingBottom: dynamicTabBarHeight,
        },
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: colors.surface.elevated,
          borderTopColor: colors.border.default,
          borderTopWidth: 1,
          height: dynamicTabBarHeight,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm + insets.bottom,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
        },
        tabBarLabelStyle: {
          fontFamily,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.jobs'),
          tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: t('tabs.applications'),
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="assignments"
        options={{
          title: t('tabs.assignments'),
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
