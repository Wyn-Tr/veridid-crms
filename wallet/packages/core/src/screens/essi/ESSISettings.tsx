import React from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { ESSIScreen } from '../../components/essi'
import { palette, radius, spacing, typography } from '../../theme/essi'
import { Screens } from '../../types/navigators'
import { testIdWithKey } from '../../utils/testable'
import { useStore } from '../../contexts/store'
import { DispatchAction } from '../../contexts/reducers/store'

interface SettingsItemProps {
  icon: string
  title: string
  subtitle?: string
  onPress?: () => void
  showChevron?: boolean
  showToggle?: boolean
  toggleValue?: boolean
  onToggle?: (value: boolean) => void
  testID?: string
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  showChevron = true,
  showToggle = false,
  toggleValue = false,
  onToggle,
  testID,
}) => {
  const content = (
    <View style={styles.settingsItem}>
      <View style={styles.settingsIconContainer}>
        <FeatherIcon name={icon as any} size={20} color={palette.text} />
      </View>
      <View style={styles.settingsContent}>
        <Text style={styles.settingsTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingsSubtitle}>{subtitle}</Text>}
      </View>
      {showToggle && onToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: palette.outline, true: palette.primary }}
          thumbColor={palette.text}
          testID={`${testID}-toggle`}
        />
      ) : showChevron ? (
        <FeatherIcon name="chevron-right" size={20} color={palette.muted} />
      ) : null}
    </View>
  )

  if (onPress) {
    return (
      <Pressable onPress={onPress} testID={testID}>
        {content}
      </Pressable>
    )
  }

  return <View testID={testID}>{content}</View>
}

interface SettingsSectionProps {
  title: string
  children: React.ReactNode
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  )
}

const ESSISettings: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<any>>()
  const [store, dispatch] = useStore()

  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true)

  const handlePOEToggle = (value: boolean) => {
    dispatch({
      type: DispatchAction.USE_POE_FEATURES,
      payload: [value],
    })
  }

  const handlePOETimeProofPress = () => {
    navigation.navigate(Screens.POETimeProof as any)
  }

  const handlePOELocationProofPress = () => {
    navigation.navigate(Screens.POELocationProof as any)
  }

  const handleLanguagePress = () => {
    navigation.navigate(Screens.Language as any)
  }

  const handlePINPress = () => {
    navigation.navigate(Screens.ChangePIN as any)
  }

  const handleBiometricsPress = () => {
    navigation.navigate(Screens.ToggleBiometry as any)
  }

  const handleBackupPress = () => {
    // Backup feature coming soon - show toast
    // TODO: Navigate to backup screen when implemented
  }

  const handleAboutPress = () => {
    navigation.navigate(Screens.About as any)
  }

  const handlePrivacyPress = () => {
    navigation.navigate(Screens.PrivacyPolicy as any)
  }

  const handleTermsPress = () => {
    navigation.navigate(Screens.Terms as any)
  }

  const handleHelpPress = () => {
    navigation.navigate(Screens.HelpSupport as any)
  }

  return (
    <ESSIScreen headerTitle={t('Screens.Settings')} testID={testIdWithKey('Settings')} scrollable={false}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection title={t('Settings.Security')}>
          <SettingsItem
            icon="lock"
            title={t('Settings.ChangePIN')}
            subtitle={t('Settings.ChangePINDescription')}
            onPress={handlePINPress}
            testID={testIdWithKey('ChangePIN')}
          />
          <View style={styles.divider} />
          <SettingsItem
            icon="fingerprint"
            title={t('Settings.Biometrics')}
            subtitle={t('Settings.BiometricsDescription')}
            onPress={handleBiometricsPress}
            testID={testIdWithKey('Biometrics')}
          />
          <View style={styles.divider} />
          <SettingsItem
            icon="shield"
            title={t('Settings.Backup')}
            subtitle={t('Settings.BackupDescription')}
            onPress={handleBackupPress}
            testID={testIdWithKey('Backup')}
          />
        </SettingsSection>

        <SettingsSection title={t('Settings.Preferences')}>
          <SettingsItem
            icon="globe"
            title={t('Settings.Language')}
            subtitle={t('Settings.LanguageDescription')}
            onPress={handleLanguagePress}
            testID={testIdWithKey('Language')}
          />
          <View style={styles.divider} />
          <SettingsItem
            icon="bell"
            title={t('Settings.Notifications')}
            subtitle={t('Settings.NotificationsDescription')}
            showChevron={false}
            showToggle={true}
            toggleValue={notificationsEnabled}
            onToggle={setNotificationsEnabled}
            testID={testIdWithKey('Notifications')}
          />
        </SettingsSection>

        <SettingsSection title={t('Settings.About')}>
          <SettingsItem
            icon="info"
            title={t('Settings.AboutApp')}
            subtitle={t('Settings.Version')}
            onPress={handleAboutPress}
            testID={testIdWithKey('About')}
          />
          <View style={styles.divider} />
          <SettingsItem
            icon="help-circle"
            title={t('Settings.Help')}
            subtitle={t('Settings.HelpDescription')}
            onPress={handleHelpPress}
            testID={testIdWithKey('Help')}
          />
        </SettingsSection>

        <SettingsSection title={t('Settings.Legal')}>
          <SettingsItem
            icon="shield"
            title={t('Settings.Privacy')}
            subtitle={t('Settings.PrivacyPolicy')}
            onPress={handlePrivacyPress}
            testID={testIdWithKey('Privacy')}
          />
          <View style={styles.divider} />
          <SettingsItem
            icon="file-text"
            title={t('Settings.Terms')}
            subtitle={t('Settings.TermsOfService')}
            onPress={handleTermsPress}
            testID={testIdWithKey('Terms')}
          />
        </SettingsSection>

        <SettingsSection title={t('Settings.BetaFeatures')}>
          <SettingsItem
            icon="zap"
            title={t('BetaFeatures.EnablePOE')}
            subtitle={t('BetaFeatures.EnablePOEDescription')}
            showChevron={false}
            showToggle={true}
            toggleValue={store.preferences.usePOEFeatures}
            onToggle={handlePOEToggle}
            testID={testIdWithKey('POEToggle')}
          />
          {store.preferences.usePOEFeatures && (
            <>
              <View style={styles.divider} />
              <SettingsItem
                icon="clock"
                title={t('Screens.POETimeProof')}
                subtitle={t('BetaFeatures.TimeProofDescription')}
                onPress={handlePOETimeProofPress}
                testID={testIdWithKey('POETimeProof')}
              />
              <View style={styles.divider} />
              <SettingsItem
                icon="map-pin"
                title={t('Screens.POELocationProof')}
                subtitle={t('BetaFeatures.LocationProofDescription')}
                onPress={handlePOELocationProofPress}
                testID={testIdWithKey('POELocationProof')}
              />
            </>
          )}
        </SettingsSection>
      </ScrollView>
    </ESSIScreen>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    paddingVertical: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.caption,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionContent: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    minHeight: 72,
  },
  settingsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsContent: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    marginBottom: spacing.xs,
  },
  settingsSubtitle: {
    fontSize: 14,
    color: palette.muted,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: palette.outline,
    marginLeft: 76, // Icon width (48) + gap (12) + padding (16)
  },
})

export default ESSISettings
