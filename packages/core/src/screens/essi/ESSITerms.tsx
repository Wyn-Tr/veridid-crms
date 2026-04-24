import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { ESSIButton } from '../../components/essi'
import { palette, spacing, typography, radius } from '../../theme/essi'
import { testIdWithKey } from '../../utils/testable'
import { useStore } from '../../contexts/store'
import { DispatchAction } from '../../contexts/reducers/store'

export const TermsVersion = '1'

type TermsSection = {
  title: string
  body: string
}

const ESSITerms: React.FC = () => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore()
  const agreedToPreviousTerms = store.onboarding.didAgreeToTerms
  const [accepted, setAccepted] = useState(!!agreedToPreviousTerms)

  const sections: TermsSection[] = [
    {
      title: '1. Acceptance of Terms',
      body: `By downloading, installing, or using the ESSI Wallet, you signify your agreement to these Terms. Ajna Inc. reserves the right to modify these Terms at any time. Any updates will be posted here, and continued use of the Service constitutes acceptance of the revised Terms.`,
    },
    {
      title: '2. Use of the Service',
      body: 'ESSI Wallet allows you to manage your self-sovereign identity credentials. You are solely responsible for the security of your device, private keys, PINs, and any other access credentials. Ajna Inc. will never ask for your private keys or PIN.',
    },
    {
      title: '3. Privacy and Data Security',
      body: 'ESSI Wallet is designed as a self-custodial wallet, meaning you are in control of your data. Ajna Inc. does not store your personal credentials on our servers. Review our Privacy Policy for details on how data is handled.',
    },
    {
      title: '4. Disclaimer of Warranties',
      body: 'The Service is provided "as is" and "as available" without warranties of any kind. Ajna Inc. does not warrant that the Service will be uninterrupted, secure, or error-free.',
    },
    {
      title: '5. Limitation of Liability',
      body: 'To the maximum extent permitted by law, Ajna Inc. shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, resulting from your use of or inability to use the Service.',
    },
    {
      title: '6. Governing Law',
      body: 'These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict-of-law provisions.',
    },
    {
      title: '7. Changes to Terms',
      body: 'Ajna Inc. may update these Terms periodically. Please review this page regularly to stay informed about how the Service is governed.',
    },
    {
      title: '8. Contact Us',
      body: 'If you have any questions about these Terms, contact Ajna Inc. through the support options provided within the app.',
    },
  ]

  const handleAccept = () => {
    dispatch({
      type: DispatchAction.DID_AGREE_TO_TERMS,
      payload: [{ DidAgreeToTerms: TermsVersion }],
    })
  }

  const handleBack = () => {
    dispatch({
      type: DispatchAction.DID_COMPLETE_TUTORIAL,
      payload: [false],
    })
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('Screens.Terms')}</Text>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro Card */}
        <View style={styles.introCard}>
          <Text style={styles.introBold}>
            Welcome to ESSI Wallet by Ajna Inc. (&quot;Ajna&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
          </Text>
          <Text style={styles.introBody}>
            These Terms and Conditions govern your use of the ESSI Wallet mobile application (the &quot;Service&quot;).
            By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part, you
            may not access the Service.
          </Text>
          <Text style={styles.callout}>
            Your privacy is important to us. ESSI Wallet is designed to give you control over your digital identity.
          </Text>
        </View>

        {/* Sections */}
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        {/* Closing Statement */}
        <Text style={styles.closing}>
          By clicking &quot;Continue&quot; or by using the ESSI Wallet, you acknowledge that you have read, understood,
          and agree to be bound by these Terms and Conditions.
        </Text>

        {/* Notice */}
        <View style={styles.notice}>
          <FeatherIcon name="info" color={palette.text} size={20} />
          <Text style={styles.noticeText}>
            Please agree to the terms and conditions before using the ESSI Wallet application provided by Ajna Inc.
          </Text>
        </View>

        {/* Checkbox */}
        {!(agreedToPreviousTerms && store.authentication.didAuthenticate) && (
          <Pressable
            onPress={() => setAccepted((prev) => !prev)}
            style={styles.checkboxRow}
            testID={testIdWithKey('AgreeCheckbox')}
          >
            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
              {accepted ? <FeatherIcon name="check" size={18} color={palette.text} /> : null}
            </View>
            <Text style={styles.checkboxLabel}>I have read, understand and accept the terms and conditions.</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {!(agreedToPreviousTerms && store.authentication.didAuthenticate) && (
          <>
            <ESSIButton
              variant="primary"
              onPress={handleAccept}
              disabled={!accepted}
              fullWidth={true}
              testID={testIdWithKey('Continue')}
            >
              {agreedToPreviousTerms ? t('Global.Accept') : t('Global.Continue')}
            </ESSIButton>
            {!agreedToPreviousTerms && (
              <ESSIButton variant="ghost" onPress={handleBack} fullWidth={true} testID={testIdWithKey('Back')}>
                {t('Global.Back')}
              </ESSIButton>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.title,
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
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.outline,
    backgroundColor: palette.surfaceSecondary,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  introBold: {
    ...typography.bodyBold,
    color: palette.text,
  },
  introBody: {
    ...typography.body,
    color: palette.muted,
    lineHeight: 22,
  },
  callout: {
    ...typography.bodyBold,
    color: palette.text,
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
  closing: {
    ...typography.body,
    color: palette.text,
    lineHeight: 22,
  },
  notice: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.primary,
    backgroundColor: 'rgba(11, 132, 255, 0.08)',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  noticeText: {
    ...typography.body,
    color: palette.text,
    flex: 1,
    lineHeight: 22,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: palette.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  checkboxLabel: {
    ...typography.body,
    color: palette.text,
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
})

export default ESSITerms
