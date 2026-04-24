import React from 'react'
import { ScrollView, StyleSheet, Text, View, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { ESSIButton } from '../../components/essi'
import { palette, spacing, typography, radius } from '../../theme/essi'
import { testIdWithKey } from '../../utils/testable'

const ESSIAbout: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()

  const appVersion = '1.0.0' // TODO: Get from app config
  const buildNumber = '1' // TODO: Get from app config

  const handleWebsitePress = () => {
    Linking.openURL('https://ajna.io')
  }

  const handleEmailPress = () => {
    Linking.openURL('mailto:support@ajna.io')
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <ESSIButton
          variant="ghost"
          onPress={() => navigation.goBack()}
          testID={testIdWithKey('BackButton')}
        >
          <FeatherIcon name="arrow-left" size={24} color={palette.text} />
        </ESSIButton>
        <Text style={styles.headerTitle}>{t('Settings.AboutApp')}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & App Info */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <FeatherIcon name="shield" size={64} color={palette.primary} />
          </View>
          <Text style={styles.appName}>ESSI Wallet</Text>
          <Text style={styles.companyName}>by Ajna Inc.</Text>
          <Text style={styles.versionText}>
            Version {appVersion} (Build {buildNumber})
          </Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.description}>
            ESSI Wallet is a self-sovereign identity wallet that puts you in control of your digital credentials.
            Securely store, manage, and share your verifiable credentials with complete privacy.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <FeatherIcon name="lock" size={20} color={palette.primary} />
              <Text style={styles.featureText}>Self-custodial credential storage</Text>
            </View>
            <View style={styles.featureItem}>
              <FeatherIcon name="shield" size={20} color={palette.primary} />
              <Text style={styles.featureText}>End-to-end encrypted communications</Text>
            </View>
            <View style={styles.featureItem}>
              <FeatherIcon name="check-circle" size={20} color={palette.primary} />
              <Text style={styles.featureText}>Verifiable credential support</Text>
            </View>
            <View style={styles.featureItem}>
              <FeatherIcon name="git-branch" size={20} color={palette.primary} />
              <Text style={styles.featureText}>Workflow automation</Text>
            </View>
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={styles.contactButtons}>
            <ESSIButton
              variant="outline"
              onPress={handleWebsitePress}
              testID={testIdWithKey('WebsiteButton')}
            >
              <FeatherIcon name="globe" size={18} color={palette.text} style={{ marginRight: 8 }} />
              ajna.io
            </ESSIButton>
            <ESSIButton
              variant="outline"
              onPress={handleEmailPress}
              testID={testIdWithKey('EmailButton')}
            >
              <FeatherIcon name="mail" size={18} color={palette.text} style={{ marginRight: 8 }} />
              support@ajna.io
            </ESSIButton>
          </View>
        </View>

        {/* Legal */}
        <View style={styles.legalSection}>
          <Text style={styles.legalText}>
            {'\u00A9'} {new Date().getFullYear()} Ajna Inc. All rights reserved.
          </Text>
          <Text style={styles.legalText}>Made with care in India</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    ...typography.headline,
    color: palette.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: palette.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  appName: {
    ...typography.title,
    color: palette.text,
    marginBottom: spacing.xs,
  },
  companyName: {
    ...typography.body,
    color: palette.muted,
    marginBottom: spacing.sm,
  },
  versionText: {
    ...typography.caption,
    color: palette.muted,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: palette.text,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.body,
    color: palette.muted,
    lineHeight: 24,
    textAlign: 'center',
  },
  featureList: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureText: {
    ...typography.body,
    color: palette.text,
    flex: 1,
  },
  contactButtons: {
    gap: spacing.sm,
  },
  legalSection: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    gap: spacing.xs,
  },
  legalText: {
    ...typography.caption,
    color: palette.muted,
  },
})

export default ESSIAbout
