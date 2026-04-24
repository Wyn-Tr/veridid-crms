import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet, Text, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import FeatherIcon from 'react-native-vector-icons/Feather'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

import { ESSIButton, ESSIProgressDots } from '../../components/essi'
import { palette, spacing, typography, radius } from '../../theme/essi'
import { GenericFn } from '../../types/fn'
import { testIdWithKey } from '../../utils/testable'

type Slide = {
  id: string
  title: string
  description: string
  illustration: 'keys' | 'wallet' | 'journey'
}

const renderIllustration = (type: Slide['illustration']) => {
  const styles = StyleSheet.create({
    illustrationContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
  })

  switch (type) {
    case 'keys':
      return (
        <View style={styles.illustrationContent}>
          <MaterialCommunityIcons name="qrcode-scan" size={34} color={palette.text} />
          <MaterialCommunityIcons name="application" size={34} color={palette.text} />
        </View>
      )
    case 'wallet':
      return (
        <View style={styles.illustrationContent}>
          <FeatherIcon name="smartphone" size={36} color={palette.text} />
          <FeatherIcon name="lock" size={32} color={palette.text} />
        </View>
      )
    case 'journey':
    default:
      return (
        <View style={styles.illustrationContent}>
          <MaterialCommunityIcons name="city-variant-outline" size={36} color={palette.text} />
          <FeatherIcon name="smartphone" size={32} color={palette.text} />
        </View>
      )
  }
}

const OnboardingPage: React.FC<{
  slide: Slide
  index: number
  totalSlides: number
  onNext: () => void
  onBack: () => void
  onSkip: () => void
  isFirst: boolean
  isLast: boolean
}> = ({ slide, index, totalSlides, onNext, onBack, onSkip, isFirst, isLast }) => {
  const { t } = useTranslation()

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Skip button */}
      {!isLast && (
        <View style={styles.skipContainer}>
          <Pressable
            onPress={onSkip}
            testID={testIdWithKey('SkipButton')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.skip}>{t('Global.Skip')}</Text>
          </Pressable>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.illustration}>{renderIllustration(slide.illustration)}</View>

        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {isLast ? (
          <View style={styles.lastStepActions}>
            <ESSIButton variant="primary" onPress={onNext} fullWidth={true} testID={testIdWithKey('GetStarted')}>
              {t('Global.GetStarted')}
            </ESSIButton>
            <ESSIButton variant="ghost" onPress={onBack} fullWidth={true} testID={testIdWithKey('Back')}>
              {t('Global.Back')}
            </ESSIButton>
          </View>
        ) : (
          <View style={styles.actions}>
            <ESSIButton
              variant="ghost"
              onPress={onBack}
              disabled={isFirst}
              fullWidth={false}
              testID={testIdWithKey('Back')}
            >
              {t('Global.Back')}
            </ESSIButton>
            <View style={styles.progressWrapper}>
              <ESSIProgressDots total={totalSlides} current={index} testID={testIdWithKey('Progress')} />
            </View>
            <ESSIButton
              variant="primary"
              onPress={onNext}
              fullWidth={false}
              style={styles.nextButton}
              testID={testIdWithKey('Next')}
            >
              {t('Global.Next')}
            </ESSIButton>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const ESSIOnboardingPages = (onTutorialCompleted: GenericFn): Array<Element> => {
  const { t } = useTranslation()

  const slides: Slide[] = [
    {
      id: 'control',
      title: t('Onboarding.YourKeysYourControl') || 'Your Keys, Your Control',
      description:
        t('Onboarding.YourKeysDescription') ||
        'ESSI Wallet empowers you with full control over your private keys and personal data.',
      illustration: 'keys',
    },
    {
      id: 'welcome',
      title: t('Onboarding.WelcomeToESSI') || 'Welcome to ESSI Wallet',
      description:
        t('Onboarding.WelcomeDescription') ||
        'Securely manage your digital identity and credentials in one trusted place.',
      illustration: 'wallet',
    },
    {
      id: 'journey',
      title: t('Onboarding.GetStartedWithESSI') || 'Get Started with ESSI',
      description:
        t('Onboarding.GetStartedDescription') ||
        'Begin your journey toward a secure and decentralized digital identity.',
      illustration: 'journey',
    },
  ]

  const OnboardingSlider: React.FC = () => {
    const [currentIndex, setCurrentIndex] = useState(0)
    const totalSlides = slides.length
    const isFirst = currentIndex === 0
    const isLast = currentIndex === totalSlides - 1

    const handleNext = () => {
      if (isLast) {
        onTutorialCompleted()
      } else {
        setCurrentIndex((prev) => Math.min(prev + 1, totalSlides - 1))
      }
    }

    const handleBack = () => {
      setCurrentIndex((prev) => Math.max(prev - 1, 0))
    }

    const handleSkip = () => {
      onTutorialCompleted()
    }

    return (
      <OnboardingPage
        slide={slides[currentIndex]}
        index={currentIndex}
        totalSlides={totalSlides}
        onNext={handleNext}
        onBack={handleBack}
        onSkip={handleSkip}
        isFirst={isFirst}
        isLast={isLast}
      />
    )
  }

  return [<OnboardingSlider key="onboarding-slider" />]
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  skipContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md, // SafeAreaView handles status bar, so use normal padding
    paddingBottom: spacing.sm,
  },
  skip: {
    ...typography.bodyBold,
    color: palette.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.gutter,
    justifyContent: 'center',
  },
  illustration: {
    width: '100%',
    height: 200,
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.headline,
    color: palette.text,
    textAlign: 'left',
  },
  description: {
    ...typography.body,
    color: palette.muted,
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  progressWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  lastStepActions: {
    gap: spacing.md,
  },
  nextButton: {
    minWidth: 120,
  },
})

export default ESSIOnboardingPages
