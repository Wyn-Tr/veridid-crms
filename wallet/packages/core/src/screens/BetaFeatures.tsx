import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Pressable, Switch, StyleSheet, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StackScreenProps } from '@react-navigation/stack'
import Icon from 'react-native-vector-icons/MaterialIcons'

import { DispatchAction } from '../contexts/reducers/store'
import { useStore } from '../contexts/store'
import { useTheme } from '../contexts/theme'
import { testIdWithKey } from '../utils/testable'
import { ThemedText } from '../components/texts/ThemedText'
import { Screens, SettingStackParams } from '../types/navigators'

type BetaFeaturesProps = StackScreenProps<SettingStackParams, Screens.BetaFeatures>

const BetaFeatures: React.FC<BetaFeaturesProps> = ({ navigation }) => {
  const [store, dispatch] = useStore()
  const { t } = useTranslation()
  const { ColorPalette, TextTheme } = useTheme()
  const [usePOEFeatures, setUsePOEFeatures] = useState(!!store.preferences.usePOEFeatures)

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 40,
    },
    warningBanner: {
      backgroundColor: '#FFF3CD',
      padding: 16,
      marginBottom: 24,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    warningIcon: {
      marginRight: 12,
      marginTop: 2,
    },
    warningText: {
      flex: 1,
      color: '#856404',
      fontSize: 14,
      lineHeight: 20,
    },
    sectionTitle: {
      marginBottom: 16,
    },
    settingContainer: {
      flexDirection: 'row',
      marginBottom: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: ColorPalette.grayscale.veryLightGrey || '#F5F5F5',
      borderRadius: 8,
      alignItems: 'center',
    },
    settingContent: {
      flex: 1,
      marginRight: 12,
    },
    settingLabelText: {
      fontSize: 16,
      fontWeight: '600',
      color: TextTheme.normal?.color || '#000',
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 14,
      color: ColorPalette.grayscale.mediumGrey || '#666',
      lineHeight: 20,
    },
    settingSwitchContainer: {
      justifyContent: 'center',
    },
    featureCard: {
      backgroundColor: ColorPalette.grayscale.veryLightGrey || '#F5F5F5',
      padding: 16,
      marginBottom: 12,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    featureCardContent: {
      flex: 1,
    },
    featureCardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: TextTheme.normal?.color || '#000',
      marginBottom: 4,
    },
    featureCardDescription: {
      fontSize: 14,
      color: ColorPalette.grayscale.mediumGrey || '#666',
      lineHeight: 20,
    },
    featureCardArrow: {
      marginLeft: 12,
    },
    disabledCard: {
      opacity: 0.5,
    },
  })

  const togglePOEFeatures = () => {
    if (!usePOEFeatures) {
      Alert.alert(
        t('BetaFeatures.EnablePOETitle'),
        t('BetaFeatures.EnablePOEMessage'),
        [
          { text: t('Global.Cancel'), style: 'cancel' },
          {
            text: t('Global.Confirm'),
            onPress: () => {
              dispatch({
                type: DispatchAction.USE_POE_FEATURES,
                payload: [true],
              })
              setUsePOEFeatures(true)
            },
          },
        ]
      )
    } else {
      dispatch({
        type: DispatchAction.USE_POE_FEATURES,
        payload: [false],
      })
      setUsePOEFeatures(false)
    }
  }

  const navigateToTimeProof = () => {
    if (usePOEFeatures) {
      navigation.navigate(Screens.POETimeProof)
    }
  }

  const navigateToLocationProof = () => {
    if (usePOEFeatures) {
      navigation.navigate(Screens.POELocationProof)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <Icon name="warning" size={24} color="#856404" style={styles.warningIcon} />
          <ThemedText style={styles.warningText}>
            {t('BetaFeatures.WarningMessage')}
          </ThemedText>
        </View>

        {/* POE Section Title */}
        <ThemedText variant="headingThree" style={styles.sectionTitle}>
          {t('BetaFeatures.POETitle')}
        </ThemedText>

        {/* POE Features Toggle */}
        <View style={styles.settingContainer}>
          <View style={styles.settingContent}>
            <ThemedText style={styles.settingLabelText}>
              {t('BetaFeatures.EnablePOE')}
            </ThemedText>
            <ThemedText style={styles.settingDescription}>
              {t('BetaFeatures.EnablePOEDescription')}
            </ThemedText>
          </View>
          <Pressable
            style={styles.settingSwitchContainer}
            accessibilityLabel={t('BetaFeatures.TogglePOE')}
            accessibilityRole={'switch'}
            testID={testIdWithKey('TogglePOEFeatures')}
          >
            <Switch
              trackColor={{ false: ColorPalette.grayscale.lightGrey, true: ColorPalette.brand.primaryDisabled }}
              thumbColor={usePOEFeatures ? ColorPalette.brand.primary : ColorPalette.grayscale.mediumGrey}
              ios_backgroundColor={ColorPalette.grayscale.lightGrey}
              onValueChange={togglePOEFeatures}
              testID={testIdWithKey('POEFeaturesSwitchElement')}
              value={usePOEFeatures}
            />
          </Pressable>
        </View>

        {/* POE Sub-features */}
        <Pressable
          style={[styles.featureCard, !usePOEFeatures && styles.disabledCard]}
          onPress={navigateToTimeProof}
          disabled={!usePOEFeatures}
          testID={testIdWithKey('POETimeProofCard')}
          accessibilityLabel={t('BetaFeatures.GenerateTimeProof')}
        >
          <Icon name="schedule" size={28} color={usePOEFeatures ? ColorPalette.brand.primary : ColorPalette.grayscale.mediumGrey} style={{ marginRight: 16 }} />
          <View style={styles.featureCardContent}>
            <ThemedText style={styles.featureCardTitle}>
              {t('BetaFeatures.GenerateTimeProof')}
            </ThemedText>
            <ThemedText style={styles.featureCardDescription}>
              {t('BetaFeatures.TimeProofDescription')}
            </ThemedText>
          </View>
          <Icon name="chevron-right" size={24} color={ColorPalette.grayscale.mediumGrey} style={styles.featureCardArrow} />
        </Pressable>

        <Pressable
          style={[styles.featureCard, !usePOEFeatures && styles.disabledCard]}
          onPress={navigateToLocationProof}
          disabled={!usePOEFeatures}
          testID={testIdWithKey('POELocationProofCard')}
          accessibilityLabel={t('BetaFeatures.GenerateLocationProof')}
        >
          <Icon name="location-on" size={28} color={usePOEFeatures ? ColorPalette.brand.primary : ColorPalette.grayscale.mediumGrey} style={{ marginRight: 16 }} />
          <View style={styles.featureCardContent}>
            <ThemedText style={styles.featureCardTitle}>
              {t('BetaFeatures.GenerateLocationProof')}
            </ThemedText>
            <ThemedText style={styles.featureCardDescription}>
              {t('BetaFeatures.LocationProofDescription')}
            </ThemedText>
          </View>
          <Icon name="chevron-right" size={24} color={ColorPalette.grayscale.mediumGrey} style={styles.featureCardArrow} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

export default BetaFeatures
