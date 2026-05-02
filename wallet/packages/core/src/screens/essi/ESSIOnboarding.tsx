import React, { useState, useRef, useMemo } from 'react'
import { View, Text, StyleSheet, FlatList, Dimensions, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { ESSIButton, ESSIProgressDots } from '../../components/essi'
import { spacing, typography } from '../../theme/essi'
import { useWalletVisualPalette, type WalletVisualPalette } from '../../theme/essi'
import { testIdWithKey } from '../../utils/testable'
import { useStore } from '../../contexts/store'
import { DispatchAction } from '../../contexts/reducers/store'

const { width } = Dimensions.get('window')

interface OnboardingSlide {
  id: string
  icon: string
  title: string
  description: string
}

function buildOnboardingStyles(p: WalletVisualPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: p.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: spacing.gutter,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
    skipText: {
      ...typography.body,
      color: p.muted,
    },
    slide: {
      width,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.gutter,
    },
    iconContainer: {
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: p.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    title: {
      ...typography.title,
      color: p.text,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    description: {
      ...typography.body,
      color: p.muted,
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: 320,
    },
    footer: {
      paddingHorizontal: spacing.gutter,
      paddingBottom: spacing.xl,
      gap: spacing.xl,
    },
  })
}

const ESSIOnboarding: React.FC = () => {
  const { t } = useTranslation()
  const [, dispatch] = useStore()
  const flatListRef = useRef<FlatList>(null)
  const palette = useWalletVisualPalette()
  const styles = useMemo(() => buildOnboardingStyles(palette), [palette])

  const [currentIndex, setCurrentIndex] = useState(0)

  const slides: OnboardingSlide[] = [
    {
      id: '1',
      icon: 'shield',
      title: t('Onboarding.Slide1Title'),
      description: t('Onboarding.Slide1Description'),
    },
    {
      id: '2',
      icon: 'credit-card',
      title: t('Onboarding.Slide2Title'),
      description: t('Onboarding.Slide2Description'),
    },
    {
      id: '3',
      icon: 'lock',
      title: t('Onboarding.Slide3Title'),
      description: t('Onboarding.Slide3Description'),
    },
    {
      id: '4',
      icon: 'users',
      title: t('Onboarding.Slide4Title'),
      description: t('Onboarding.Slide4Description'),
    },
  ]

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      })
    } else {
      handleGetStarted()
    }
  }

  const handleSkip = () => {
    handleGetStarted()
  }

  const handleGetStarted = () => {
    dispatch({
      type: DispatchAction.DID_COMPLETE_TUTORIAL,
    })
  }

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x
    const index = Math.round(scrollPosition / width)
    setCurrentIndex(index)
  }

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      <View style={styles.iconContainer}>
        <FeatherIcon name={item.icon as any} size={80} color={palette.primary} />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  )

  const isLastSlide = currentIndex === slides.length - 1

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {!isLastSlide && (
          <Pressable
            onPress={handleSkip}
            testID={testIdWithKey('SkipButton')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.skipText}>{t('Onboarding.Skip')}</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      />

      <View style={styles.footer}>
        <ESSIProgressDots total={slides.length} current={currentIndex} testID={testIdWithKey('OnboardingProgress')} />

        <ESSIButton variant="primary" onPress={handleNext} fullWidth={true} testID={testIdWithKey('NextButton')}>
          {isLastSlide ? t('Onboarding.GetStarted') : t('Onboarding.Next')}
        </ESSIButton>
      </View>
    </SafeAreaView>
  )
}

export default ESSIOnboarding
