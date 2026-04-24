import React, { useCallback, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, StyleSheet, Linking, Platform, Switch, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { check, PERMISSIONS, PermissionStatus, request, RESULTS } from 'react-native-permissions'
import { getSupportedBiometryType, BIOMETRY_TYPE } from 'react-native-keychain'
import FeatherIcon from 'react-native-vector-icons/Feather'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'

import { ESSIButton } from '../../components/essi'
import { palette, spacing, typography, radius } from '../../theme/essi'
import { testIdWithKey } from '../../utils/testable'
import { useAuth } from '../../contexts/auth'
import { DispatchAction } from '../../contexts/reducers/store'
import { useStore } from '../../contexts/store'

const BIOMETRY_PERMISSION = PERMISSIONS.IOS.FACE_ID

type BiometryParams = {
  onboarding?: boolean
}

const ESSIBiometry: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<any>>()
  const route = useRoute<RouteProp<{ params: BiometryParams }, 'params'>>()
  const [store, dispatch] = useStore()
  const { commitWalletToKeychain, isBiometricsActive } = useAuth()
  const [biometryEnabled, setBiometryEnabled] = useState(store.preferences.useBiometry)
  const [biometryAvailable, setBiometryAvailable] = useState(false)
  const [continueEnabled, setContinueEnabled] = useState(true)

  // Check if we're in onboarding or settings
  const isOnboarding = route.params?.onboarding || !store.onboarding.didConsiderBiometry

  useEffect(() => {
    isBiometricsActive().then((result: boolean) => {
      setBiometryAvailable(result)
    })
  }, [isBiometricsActive])

  const continueTouched = useCallback(async () => {
    setContinueEnabled(false)

    await commitWalletToKeychain(biometryEnabled)

    dispatch({
      type: DispatchAction.USE_BIOMETRY,
      payload: [biometryEnabled],
    })
  }, [biometryEnabled, commitWalletToKeychain, dispatch])

  const onRequestSystemBiometrics = useCallback(async (newToggleValue: boolean) => {
    const permissionResult: PermissionStatus = await request(BIOMETRY_PERMISSION)
    switch (permissionResult) {
      case RESULTS.GRANTED:
      case RESULTS.LIMITED:
        setBiometryEnabled(newToggleValue)
        break
      default:
        break
    }
  }, [])

  const onCheckSystemBiometrics = useCallback(async (): Promise<PermissionStatus> => {
    if (Platform.OS === 'android') {
      return biometryAvailable ? RESULTS.GRANTED : RESULTS.UNAVAILABLE
    } else if (Platform.OS === 'ios') {
      return await check(BIOMETRY_PERMISSION)
    }
    return RESULTS.UNAVAILABLE
  }, [biometryAvailable])

  const toggleSwitch = useCallback(async () => {
    const newValue = !biometryEnabled

    if (!newValue) {
      setBiometryEnabled(newValue)
      // If in settings mode, save immediately
      if (!isOnboarding) {
        await commitWalletToKeychain(newValue)
        dispatch({
          type: DispatchAction.USE_BIOMETRY,
          payload: [newValue],
        })
      }
      return
    }

    const permissionResult: PermissionStatus = await onCheckSystemBiometrics()
    const supported_type = await getSupportedBiometryType()

    switch (permissionResult) {
      case RESULTS.GRANTED:
      case RESULTS.LIMITED:
        setBiometryEnabled(newValue)
        // If in settings mode, save immediately
        if (!isOnboarding) {
          await commitWalletToKeychain(newValue)
          dispatch({
            type: DispatchAction.USE_BIOMETRY,
            payload: [newValue],
          })
        }
        break
      case RESULTS.UNAVAILABLE:
        if (Platform.OS === 'ios' && supported_type === BIOMETRY_TYPE.TOUCH_ID) {
          setBiometryEnabled(newValue)
          // If in settings mode, save immediately
          if (!isOnboarding) {
            await commitWalletToKeychain(newValue)
            dispatch({
              type: DispatchAction.USE_BIOMETRY,
              payload: [newValue],
            })
          }
        }
        break
      case RESULTS.BLOCKED:
        await Linking.openSettings()
        break
      case RESULTS.DENIED:
        await onRequestSystemBiometrics(newValue)
        break
      default:
        break
    }
  }, [
    onRequestSystemBiometrics,
    onCheckSystemBiometrics,
    biometryEnabled,
    isOnboarding,
    commitWalletToKeychain,
    dispatch,
  ])

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        {!isOnboarding && (
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID={testIdWithKey('BackButton')}
          >
            <FeatherIcon name="arrow-left" size={24} color={palette.text} />
          </Pressable>
        )}
        <Text style={styles.headerTitle}>{t('Screens.Biometry')}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <FeatherIcon name="shield" size={80} color={palette.primary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{t('Biometry.UseToUnlock')}</Text>

        {/* Description */}
        {biometryAvailable ? (
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>{t('Biometry.EnabledText1')}</Text>
            <Text style={styles.description}>{t('Biometry.EnabledText2')}</Text>
            <Text style={styles.description}>
              <Text style={styles.warningText}>{t('Biometry.Warning')}</Text>
            </Text>
          </View>
        ) : (
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>{t('Biometry.NotEnabledText1')}</Text>
            <Text style={styles.description}>{t('Biometry.NotEnabledText2')}</Text>
          </View>
        )}

        {/* Toggle Card */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleTitle}>{t('Biometry.UseToUnlock')}</Text>
            </View>
            <Switch
              testID={testIdWithKey('BiometryToggle')}
              value={biometryEnabled}
              onValueChange={toggleSwitch}
              trackColor={{ false: palette.outline, true: palette.primary }}
              thumbColor={palette.text}
            />
          </View>
        </View>
      </View>

      {/* Footer - only show Continue button during onboarding */}
      {isOnboarding && (
        <View style={styles.footer}>
          <ESSIButton
            variant="primary"
            onPress={continueTouched}
            disabled={!continueEnabled}
            loading={!continueEnabled}
            fullWidth={true}
            testID={testIdWithKey('Continue')}
          >
            {t('Global.Continue')}
          </ESSIButton>
        </View>
      )}
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
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  headerTitle: {
    ...typography.title,
    color: palette.text,
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.gutter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: palette.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    color: palette.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  descriptionContainer: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  description: {
    ...typography.body,
    color: palette.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  warningText: {
    ...typography.bodyBold,
    color: palette.text,
  },
  toggleCard: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.outline,
    backgroundColor: palette.surfaceSecondary,
    padding: spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleTitle: {
    ...typography.bodyBold,
    color: palette.text,
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.xl,
  },
})

export default ESSIBiometry
