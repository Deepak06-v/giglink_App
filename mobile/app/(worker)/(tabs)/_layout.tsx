import { Tabs } from 'expo-router';
import { Briefcase, ClipboardList, FileText, User } from '@/components/icons';
import { useFontFamily } from '@/constants/fonts';
import { colors, radius, sizes, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';

export default function WorkerTabsLayout() {
  const { t } = useTranslation();
  const fontFamily = useFontFamily(500);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: colors.background.primary,
          paddingBottom: sizes.tabBarHeight,
        },
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: colors.surface.elevated,
          borderTopColor: colors.border.default,
          borderTopWidth: 1,
          height: sizes.tabBarHeight,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
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
