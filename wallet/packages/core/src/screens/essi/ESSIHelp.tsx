import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, View, Pressable, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { ESSIButton } from '../../components/essi'
import { palette, spacing, typography, radius } from '../../theme/essi'
import { testIdWithKey } from '../../utils/testable'

type FAQItem = {
  question: string
  answer: string
}

const ESSIHelp: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const faqs: FAQItem[] = [
    {
      question: 'What is ESSI Wallet?',
      answer: 'ESSI Wallet is a self-sovereign identity wallet that allows you to securely store, manage, and share your digital credentials. It puts you in complete control of your personal data.',
    },
    {
      question: 'How do I add credentials?',
      answer: 'You can add credentials by scanning a QR code from an issuing organization, or by accepting a credential offer sent directly to your wallet through an established connection.',
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes! All your credentials are encrypted and stored locally on your device. We use industry-standard encryption and never store your data on our servers.',
    },
    {
      question: 'What happens if I lose my phone?',
      answer: 'Your credentials are stored locally on your device. We recommend regularly backing up your wallet. You can restore your credentials from a backup on a new device.',
    },
    {
      question: 'How do I connect with organizations?',
      answer: 'You can connect with organizations by scanning their QR code or by receiving and accepting a connection invitation. Once connected, they can issue credentials to you or request proof of your credentials.',
    },
    {
      question: 'What are workflows?',
      answer: 'Workflows are multi-step processes that guide you through complex interactions like applying for a credential, completing verification, or signing documents. They appear automatically when organizations initiate them with you.',
    },
    {
      question: 'Can I delete my credentials?',
      answer: 'Yes, you can delete any credential at any time from the credential details screen. Deleted credentials cannot be recovered unless the issuer reissues them.',
    },
    {
      question: 'How do I change my PIN?',
      answer: 'Go to Settings > Security > Change PIN. You will need to enter your current PIN before setting a new one.',
    },
  ]

  const toggleExpanded = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@ajna.io?subject=ESSI%20Wallet%20Support')
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
        <Text style={styles.headerTitle}>{t('Settings.Help')}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Support */}
        <View style={styles.supportCard}>
          <View style={styles.supportIcon}>
            <FeatherIcon name="headphones" size={32} color={palette.primary} />
          </View>
          <Text style={styles.supportTitle}>Need Help?</Text>
          <Text style={styles.supportText}>
            Our support team is here to help you with any questions or issues.
          </Text>
          <ESSIButton
            variant="primary"
            onPress={handleEmailSupport}
            fullWidth
            testID={testIdWithKey('ContactSupport')}
          >
            <FeatherIcon name="mail" size={18} color={palette.text} style={{ marginRight: 8 }} />
            Contact Support
          </ESSIButton>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          {faqs.map((faq, index) => (
            <Pressable
              key={index}
              style={styles.faqItem}
              onPress={() => toggleExpanded(index)}
              testID={testIdWithKey(`FAQ-${index}`)}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <FeatherIcon
                  name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={palette.muted}
                />
              </View>
              {expandedIndex === index && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </Pressable>
          ))}
        </View>

        {/* Quick Links */}
        <View style={styles.quickLinks}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.linksList}>
            <Pressable
              style={styles.linkItem}
              onPress={() => Linking.openURL('https://ajna.io/docs')}
            >
              <FeatherIcon name="book-open" size={20} color={palette.primary} />
              <Text style={styles.linkText}>Documentation</Text>
              <FeatherIcon name="external-link" size={16} color={palette.muted} />
            </Pressable>
            <Pressable
              style={styles.linkItem}
              onPress={() => Linking.openURL('https://ajna.io/tutorials')}
            >
              <FeatherIcon name="play-circle" size={20} color={palette.primary} />
              <Text style={styles.linkText}>Video Tutorials</Text>
              <FeatherIcon name="external-link" size={16} color={palette.muted} />
            </Pressable>
            <Pressable
              style={styles.linkItem}
              onPress={() => Linking.openURL('https://ajna.io/community')}
            >
              <FeatherIcon name="users" size={20} color={palette.primary} />
              <Text style={styles.linkText}>Community Forum</Text>
              <FeatherIcon name="external-link" size={16} color={palette.muted} />
            </Pressable>
          </View>
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
  supportCard: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  supportIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportTitle: {
    ...typography.headline,
    color: palette.text,
  },
  supportText: {
    ...typography.body,
    color: palette.muted,
    textAlign: 'center',
  },
  faqSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: palette.text,
    marginBottom: spacing.xs,
  },
  faqItem: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    ...typography.bodyBold,
    color: palette.text,
    flex: 1,
    paddingRight: spacing.sm,
  },
  faqAnswer: {
    ...typography.body,
    color: palette.muted,
    marginTop: spacing.md,
    lineHeight: 22,
  },
  quickLinks: {
    gap: spacing.md,
  },
  linksList: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.outline,
  },
  linkText: {
    ...typography.body,
    color: palette.text,
    flex: 1,
  },
})

export default ESSIHelp
