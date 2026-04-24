import { useAgent } from '@credo-ts/react-hooks'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View, Text, Linking } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { SafeAreaView } from 'react-native-safe-area-context'
import FeatherIcon from 'react-native-vector-icons/Feather'
import { PERMISSIONS, Permission, RESULTS, Rationale, check, request, PermissionStatus } from 'react-native-permissions'
import { Platform } from 'react-native'
import Toast from 'react-native-toast-message'

import { palette, spacing, typography } from '../../theme/essi'
import { QrCodeScanError, BifoldError } from '../../types/error'
import { ConnectStackParams, Screens } from '../../types/navigators'
import { testIdWithKey } from '../../utils/testable'
import LoadingView from '../../components/views/LoadingView'
import CameraDisclosureModal from '../../components/modals/CameraDisclosureModal'
import ScanCamera from '../../components/misc/ScanCamera'
import DismissiblePopupModal from '../../components/modals/DismissiblePopupModal'
import { ToastType } from '../../components/toast/BaseToast'
import { TOKENS, useServices } from '../../container-api'
import { connectFromScanOrDeepLink } from '../../utils/helpers'
import { PermissionContract } from '../../types/permissions'

export type ScanProps = StackScreenProps<ConnectStackParams>

type CameraPermissionState = 'loading' | 'granted' | 'denied' | 'blocked' | 'unavailable'

const ESSIScan: React.FC<ScanProps> = ({ navigation }) => {
  const { agent } = useAgent()
  const { t } = useTranslation()
  const [loading, setLoading] = useState<boolean>(true)
  const [permissionState, setPermissionState] = useState<CameraPermissionState>('loading')
  const [showDisclosureModal, setShowDisclosureModal] = useState<boolean>(false)
  const [showBlockedModal, setShowBlockedModal] = useState<boolean>(false)
  const [qrCodeScanError, setQrCodeScanError] = useState<QrCodeScanError | null>(null)
  const [torchActive, setTorchActive] = useState(false)
  const [showErrorDetailsModal, setShowErrorDetailsModal] = useState(false)
  const [{ enableImplicitInvitations, enableReuseConnections }, logger] = useServices([
    TOKENS.CONFIG,
    TOKENS.UTIL_LOGGER,
  ])

  const handleInvitation = useCallback(
    async (value: string): Promise<void> => {
      try {
        await connectFromScanOrDeepLink(
          value,
          agent,
          logger,
          navigation?.getParent(),
          false, // isDeepLink
          enableImplicitInvitations,
          enableReuseConnections
        )
      } catch (err: unknown) {
        const error = new BifoldError(
          t('Error.Title1031'),
          t('Error.Message1031'),
          (err as Error)?.message ?? err,
          1031
        )
        throw error
      }
    },
    [agent, logger, navigation, enableImplicitInvitations, enableReuseConnections, t]
  )

  const handleCodeScan = useCallback(
    async (value: string) => {
      setQrCodeScanError(null)
      try {
        const uri = value
        await handleInvitation(uri)
      } catch (e: unknown) {
        const error = new QrCodeScanError(t('Scan.InvalidQrCode'), value, (e as Error)?.message)
        setQrCodeScanError(error)
      }
    },
    [handleInvitation, t]
  )

  const getCameraPermission = (): Permission => {
    return Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA
  }

  const requestCameraPermission = useCallback(async () => {
    try {
      const permission = getCameraPermission()
      logger.info('Requesting camera permission...')
      const status = await request(permission)
      logger.info(`Camera permission request result: ${status}`)

      if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) {
        setPermissionState('granted')
        setShowDisclosureModal(false)
        setShowBlockedModal(false)
      } else if (status === RESULTS.BLOCKED) {
        setPermissionState('blocked')
        setShowBlockedModal(true)
        setShowDisclosureModal(false)
      } else {
        // Still denied - show disclosure modal for retry
        setPermissionState('denied')
        setShowDisclosureModal(true)
      }

      return status === RESULTS.GRANTED || status === RESULTS.LIMITED
    } catch (error) {
      logger.error(`Failed to request camera permission: ${error}`)
      Toast.show({
        type: ToastType.Error,
        text1: t('Global.Failure'),
        text2: (error as Error)?.message || t('Error.Unknown'),
        visibilityTime: 2000,
        position: 'bottom',
      })
      return false
    }
  }, [logger, t])

  const checkCameraPermission = useCallback(async () => {
    try {
      const permission = getCameraPermission()
      const status = await check(permission)
      logger.info(`Camera permission check result: ${status}`)

      if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) {
        setPermissionState('granted')
        setShowDisclosureModal(false)
        setShowBlockedModal(false)
      } else if (status === RESULTS.BLOCKED) {
        setPermissionState('blocked')
        setShowBlockedModal(true)
      } else if (status === RESULTS.DENIED) {
        // Permission not yet requested or can be requested again
        // Automatically request it
        await requestCameraPermission()
      } else if (status === RESULTS.UNAVAILABLE) {
        setPermissionState('unavailable')
        Toast.show({
          type: ToastType.Error,
          text1: t('Global.Failure'),
          text2: t('CameraDisclosure.CameraUnavailable') || 'Camera is not available on this device',
          visibilityTime: 3000,
          position: 'bottom',
        })
      }
    } catch (error) {
      logger.error(`Failed to check camera permission: ${error}`)
      // Try requesting permission as fallback
      await requestCameraPermission()
    }
  }, [logger, requestCameraPermission, t])

  const requestCameraUse = async (rationale?: Rationale): Promise<boolean> => {
    return requestCameraPermission()
  }

  const handleOpenSettings = async () => {
    await Linking.openSettings()
    navigation.goBack()
  }

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const clipboardContent = await Clipboard.getString()

      if (!clipboardContent || clipboardContent.trim().length === 0) {
        Toast.show({
          type: ToastType.Warn,
          text1: t('Scan.ClipboardEmpty'),
          text2: t('Scan.ClipboardEmptyDescription'),
          visibilityTime: 2000,
          position: 'bottom',
        })
        return
      }

      // Process the pasted content as an invitation
      await handleCodeScan(clipboardContent.trim())
    } catch (error) {
      logger.error(`Failed to read clipboard: ${error}`)
      Toast.show({
        type: ToastType.Error,
        text1: t('Global.Failure'),
        text2: t('Scan.ClipboardError'),
        visibilityTime: 2000,
        position: 'bottom',
      })
    }
  }, [handleCodeScan, logger, t])

  useEffect(() => {
    const initPermission = async () => {
      await checkCameraPermission()
      setLoading(false)
    }
    initPermission()
  }, [checkCameraPermission])

  // Set navigation options to hide header - must be before conditional returns
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    })
  }, [navigation])

  if (loading) {
    return <LoadingView />
  }

  if (showBlockedModal) {
    return (
      <DismissiblePopupModal
        title={t('CameraDisclosure.AllowCameraUse')}
        description={t('CameraDisclosure.CameraBlocked') || 'Camera access is blocked. Please enable it in your device settings to scan QR codes.'}
        onCallToActionLabel={t('CameraDisclosure.OpenSettings')}
        onCallToActionPressed={handleOpenSettings}
        onDismissPressed={() => navigation.goBack()}
      />
    )
  }

  if (showDisclosureModal) {
    return <CameraDisclosureModal requestCameraUse={requestCameraUse} />
  }

  if (permissionState !== 'granted') {
    return <LoadingView />
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <ScanCamera
        handleCodeScan={handleCodeScan}
        error={qrCodeScanError}
        enableCameraOnError={true}
        torchActive={torchActive}
      />

      {/* Custom Rounded Corner Overlay */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanArea}>
            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerTopRight} />
            <View style={styles.cornerBottomLeft} />
            <View style={styles.cornerBottomRight} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      {/* Overlay Content */}
      <SafeAreaView style={styles.overlayContent} edges={['top', 'bottom']}>
        {/* Top Controls */}
        <View style={styles.topControls}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID={testIdWithKey('BackButton')}
            style={styles.controlButton}
          >
            <FeatherIcon name="arrow-left" size={24} color={palette.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('Scan.ScanQRCode')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Spacer to push content down */}
        <View style={{ flex: 1 }} />

        {/* Bottom Content */}
        <View style={styles.bottomContent}>
          {/* Error/Info Message - only show when there's an error */}
          {qrCodeScanError && (
            <View style={styles.messageContainer}>
              <View style={styles.errorIconContainer}>
                <FeatherIcon name="alert-circle" size={20} color={palette.danger} />
              </View>
              <Text style={styles.errorText}>{qrCodeScanError.message}</Text>
              <Pressable
                onPress={() => setShowErrorDetailsModal(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                testID={testIdWithKey('ShowDetails')}
              >
                <FeatherIcon name="info" size={20} color={palette.text} />
              </Pressable>
            </View>
          )}

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            <Pressable
              onPress={() => navigation.navigate(Screens.ScanHelp as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID={testIdWithKey('ScanHelp')}
              style={styles.controlButton}
            >
              <FeatherIcon name="help-circle" size={24} color={palette.text} />
            </Pressable>
            <Pressable
              onPress={handlePasteFromClipboard}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID={testIdWithKey('PasteFromClipboard')}
              style={styles.controlButton}
            >
              <FeatherIcon name="clipboard" size={24} color={palette.text} />
            </Pressable>
            <Pressable
              onPress={() => setTorchActive(!torchActive)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID={testIdWithKey('ToggleTorch')}
              style={styles.controlButton}
            >
              <FeatherIcon
                name={torchActive ? 'zap' : 'zap-off'}
                size={24}
                color={torchActive ? palette.primary : palette.text}
              />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* Error Details Modal */}
      {showErrorDetailsModal && (
        <DismissiblePopupModal
          title={t('Scan.ErrorDetails')}
          description={qrCodeScanError?.details || t('Scan.NoDetails')}
          onCallToActionLabel={t('Global.Dismiss')}
          onCallToActionPressed={() => setShowErrorDetailsModal(false)}
          onDismissPressed={() => setShowErrorDetailsModal(false)}
        />
      )}
    </View>
  )
}

const SCAN_AREA_SIZE = 300
const CORNER_SIZE = 24
const CORNER_THICKNESS = 4

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  // Corner indicators with rounded edges
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: palette.primary,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: palette.primary,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: palette.primary,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: palette.primary,
    borderBottomRightRadius: 12,
  },
  overlayContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.sm,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.title,
    color: palette.text,
    textAlign: 'center',
  },
  bottomContent: {
    gap: spacing.lg,
  },
  messageContainer: {
    marginHorizontal: spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  errorIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.danger + '30',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  errorText: {
    ...typography.body,
    color: palette.danger,
    flex: 1,
    fontSize: 14,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.md,
  },
})

export default ESSIScan
