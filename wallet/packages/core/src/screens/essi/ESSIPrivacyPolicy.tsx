import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { ESSIButton } from '../../components/essi'
import { palette, spacing, typography, radius } from '../../theme/essi'
import { testIdWithKey } from '../../utils/testable'

type PolicySection = {
  title: string
  body: string
}

const ESSIPrivacyPolicy: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()

  const sections: PolicySection[] = [
    {
      title: '1. Data Collection',
      body: `ESSI Wallet is designed as a self-custodial wallet. This means your credentials, private keys, and personal data are stored locally on your device and are never transmitted to or stored on Ajna Inc. servers. We do not collect, store, or have access to your personal credentials.`,
    },
    {
      title: '2. Local Storage',
      body: `All your credentials and identity information are encrypted and stored locally on your device. Your data remains under your control at all times. If you delete the app, your locally stored data will be permanently removed.`,
    },
    {
      title: '3. Communications',
      body: `When you connect with organizations or individuals, communications are end-to-end encrypted using DIDComm protocols. Ajna Inc. does not have access to the content of these communications.`,
    },
    {
      title: '4. Analytics',
      body: `We may collect anonymous usage analytics to improve the app experience. This data does not include any personal information or credential data. You can opt out of analytics in the app settings.`,
    },
    {
      title: '5. Third-Party Services',
      body: `When you interact with third-party issuers or verifiers through the app, their privacy policies govern how they handle your data. We encourage you to review their policies before sharing credentials.`,
    },
    {
      title: '6. Biometric Data',
      body: `If you enable biometric authentication, your biometric data is processed locally by your device's secure enclave. Ajna Inc. never has access to your biometric information.`,
    },
    {
      title: '7. Data Security',
      body: `We implement industry-standard security measures to protect your data. All sensitive data is encrypted at rest and in transit. Your PIN and biometric data are used to unlock local encryption keys.`,
    },
    {
      title: '8. Your Rights',
      body: `You have full control over your data. You can export, delete, or modify your credentials at any time. Since we don't store your data, there's nothing for us to delete on our end.`,
    },
    {
      title: '9. Changes to Policy',
      body: `We may update this Privacy Policy periodically. Any changes will be reflected in the app, and continued use constitutes acceptance of the updated policy.`,
    },
    {
      title: '10. Contact',
      body: `If you have questions about this Privacy Policy, please contact us at privacy@ajna.io.`,
    },
  ]

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
        <Text style={styles.headerTitle}>{t('Settings.PrivacyPolicy')}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introCard}>
          <FeatherIcon name="shield" size={24} color={palette.primary} />
          <Text style={styles.introText}>
            Your privacy is our priority. ESSI Wallet is designed to give you complete control over your digital identity.
          </Text>
        </View>

        <Text style={styles.lastUpdated}>Last updated: December 2024</Text>

        {/* Sections */}
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
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
    gap: spacing.lg,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.primary,
  },
  introText: {
    ...typography.body,
    color: palette.text,
    flex: 1,
  },
  lastUpdated: {
    ...typography.caption,
    color: palette.muted,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: palette.text,
  },
  sectionBody: {
    ...typography.body,
    color: palette.muted,
    lineHeight: 22,
  },
})

export default ESSIPrivacyPolicy
