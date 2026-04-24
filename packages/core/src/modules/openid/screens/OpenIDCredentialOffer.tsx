import { BrandingOverlay } from '@bifold/oca'
import { CredentialOverlay } from '@bifold/oca/build/legacy'
import { MdocRecord, SdJwtVcRecord, W3cCredentialRecord } from '@credo-ts/core'
import { useAgent } from '@credo-ts/react-hooks'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter, StyleSheet, Text, TextInput, View } from 'react-native'
import Button, { ButtonType } from '../../../components/buttons/Button'
import CommonRemoveModal from '../../../components/modals/CommonRemoveModal'
import Record from '../../../components/record/Record'
import { EventTypes } from '../../../constants'
import { useTheme } from '../../../contexts/theme'
import { TOKENS, useServices } from '../../../container-api'
import ScreenLayout from '../../../layout/ScreenLayout'
import CredentialOfferAccept from '../../../screens/CredentialOfferAccept'
import { BifoldError } from '../../../types/error'
import { DeliveryStackParams, Screens, TabStacks } from '../../../types/navigators'
import { ModalUsage } from '../../../types/remove'
import { testIdWithKey } from '../../../utils/testable'
import CredentialCard from '../../../components/misc/CredentialCard'
import { useOpenIDCredentials } from '../context/OpenIDCredentialRecordProvider'
import { getCredentialForDisplay } from '../display'
import { NotificationEventType, useOpenId4VciNotifications } from '../notification'
import { setRefreshCredentialMetadata, temporaryMetaVanillaObject } from '../metadata'
import { useAcceptReplacement } from '../hooks/useAcceptReplacement'
import { useDeclineReplacement } from '../hooks/useDeclineReplacement'
import { acquirePreAuthorizedAccessToken, receiveCredentialFromOpenId4VciOffer } from '../offerResolve'
import { getCredentialConfigurationIds } from '../utils/utils'
import { RefreshStatus } from '../refresh/types'
import { OpenId4VciPendingCredentialOffer } from '../types'

type OpenIDCredentialDetailsProps = StackScreenProps<DeliveryStackParams, Screens.OpenIDCredentialOffer>
type OpenIDIssuedCredential = W3cCredentialRecord | SdJwtVcRecord | MdocRecord

const OpenIDCredentialOffer: React.FC<OpenIDCredentialDetailsProps> = ({ navigation, route }) => {
  // FIXME: change params to accept credential id to avoid 'non-serializable' warnings
  const { credential } = route.params
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { t } = useTranslation()
  const isPendingCredentialOffer =
    (credential as OpenId4VciPendingCredentialOffer)?.type === 'OpenId4VciPendingCredentialOffer'
  const pendingOffer = isPendingCredentialOffer ? (credential as OpenId4VciPendingCredentialOffer) : undefined
  const issuedCredential = isPendingCredentialOffer ? undefined : (credential as OpenIDIssuedCredential)
  const credentialDisplay = issuedCredential ? getCredentialForDisplay(issuedCredential) : undefined
  const display = credentialDisplay?.display
  const issuerName =
    display?.issuer.name ||
    pendingOffer?.resolvedCredentialOffer.metadata.credentialIssuerMetadata.display?.[0]?.name ||
    t('ContactDetails.AContact')

  // console.log('$$ ====> Credential Display', JSON.stringify(credentialDisplay))
  const { ColorPalette, TextTheme } = useTheme()
  const { agent } = useAgent()
  const { resolveBundleForCredential } = useOpenIDCredentials()
  const { sendOpenId4VciNotification } = useOpenId4VciNotifications()

  const [isRemoveModalDisplayed, setIsRemoveModalDisplayed] = useState(false)
  const [buttonsVisible, setButtonsVisible] = useState(true)
  const [acceptModalVisible, setAcceptModalVisible] = useState(false)
  const [txCode, setTxCode] = useState('')
  const [txCodeError, setTxCodeError] = useState<string | undefined>(undefined)
  const [keepTxCodeFocus, setKeepTxCodeFocus] = useState(true)
  const txCodeInputRef = useRef<TextInput>(null)
  const { acceptNewCredential } = useAcceptReplacement()
  const { declineByNewId } = useDeclineReplacement({ logger: logger })

  const [overlay, setOverlay] = useState<CredentialOverlay<BrandingOverlay>>({
    bundle: undefined,
    presentationFields: [],
    metaOverlay: undefined,
    brandingOverlay: undefined,
  })

  useEffect(() => {
    if (!issuedCredential) {
      return
    }

    const resolveOverlay = async () => {
      const brandingOverlay = await resolveBundleForCredential(issuedCredential)
      setOverlay(brandingOverlay)
    }

    resolveOverlay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issuedCredential, resolveBundleForCredential])

  const styles = StyleSheet.create({
    headerTextContainer: {
      paddingHorizontal: 25,
      paddingVertical: 16,
    },
    headerText: {
      ...TextTheme.normal,
      flexShrink: 1,
    },
    txCodeContainer: {
      marginBottom: 16,
    },
    txCodeLabel: {
      ...TextTheme.normal,
      marginBottom: 6,
    },
    txCodeInput: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: TextTheme.normal.color,
      borderColor: ColorPalette.brand.secondaryBackground,
      backgroundColor: ColorPalette.brand.secondaryBackground,
    },
    txCodeHelpText: {
      ...TextTheme.label,
      marginTop: 6,
    },
    txCodeErrorText: {
      ...TextTheme.label,
      marginTop: 6,
      color: ColorPalette.semantic.error,
    },
    footerButton: {
      paddingTop: 10,
    },
  })

  const toggleDeclineModalVisible = () => setIsRemoveModalDisplayed(!isRemoveModalDisplayed)

  const handleDeclineTouched = async () => {
    if (isPendingCredentialOffer) {
      toggleDeclineModalVisible()
      navigation.getParent()?.navigate(TabStacks.HomeStack, { screen: Screens.Home })
      return
    }
    if (!issuedCredential) {
      return
    }
    await handleSendNotification(NotificationEventType.CREDENTIAL_DELETED)
    await declineByNewId(issuedCredential.id)
    toggleDeclineModalVisible()
    navigation.getParent()?.navigate(TabStacks.HomeStack, { screen: Screens.Home })
  }

  const handleSendNotification = async (notificationEventType: NotificationEventType) => {
    try {
      if (
        temporaryMetaVanillaObject.notificationMetadata?.notificationId &&
        temporaryMetaVanillaObject.notificationMetadata?.notificationEndpoint &&
        temporaryMetaVanillaObject.tokenResponse?.accessToken
      ) {
        await sendOpenId4VciNotification({
          accessToken: temporaryMetaVanillaObject.tokenResponse?.accessToken,
          notificationEvent: notificationEventType,
          notificationMetadata: {
            notificationId: temporaryMetaVanillaObject?.notificationMetadata?.notificationId,
            notificationEndpoint: temporaryMetaVanillaObject?.notificationMetadata?.notificationEndpoint,
          },
        })
      }
    } catch (err) {
      logger.error('[Credential Offer] error sending notification')
    }
  }

  const handleAcceptTouched = async () => {
    if (!agent) {
      return
    }
    try {
      if (isPendingCredentialOffer && pendingOffer) {
        const trimmedCode = txCode.trim()
        const normalizedCode = trimmedCode.replace(/\s+/g, '').toUpperCase()
        const txCodeLength = pendingOffer.txCode?.length
        const requiresTxCode = !!pendingOffer.txCode || pendingOffer.userPinRequired

        if (requiresTxCode) {
          if (!normalizedCode) {
            setTxCodeError('Transaction code is required.')
            return
          }
          if (!/^[A-Za-z0-9]+$/.test(normalizedCode)) {
            setTxCodeError('Transaction code must be alphanumeric.')
            return
          }
          if (txCodeLength && normalizedCode.length !== txCodeLength) {
            setTxCodeError(`Transaction code must be ${txCodeLength} characters.`)
            return
          }
        }

        setTxCodeError(undefined)
        setButtonsVisible(false)

        const resolvedCredentialOffer = pendingOffer.resolvedCredentialOffer
        const preAuthGrant =
          resolvedCredentialOffer.credentialOfferRequestWithBaseUrl?.credential_offer?.grants?.[
            'urn:ietf:params:oauth:grant-type:pre-authorized_code'
          ]
        if (preAuthGrant?.tx_code && /[A-Za-z]/.test(normalizedCode)) {
          preAuthGrant.tx_code.input_mode = 'text'
        }
        const tokenResponse = await acquirePreAuthorizedAccessToken({
          agent,
          resolvedCredentialOffer,
          txCode: normalizedCode || undefined,
        })
        const refreshToken = (tokenResponse as unknown as { refreshToken?: string }).refreshToken

        temporaryMetaVanillaObject.tokenResponse = tokenResponse

        const credentialRecord = await receiveCredentialFromOpenId4VciOffer({
          agent,
          resolvedCredentialOffer,
          tokenResponse: tokenResponse,
        })

        const authServers = resolvedCredentialOffer.metadata.credentialIssuerMetadata.authorization_servers
        const credentialIssuer = resolvedCredentialOffer.metadata.issuer
        const authServer = credentialIssuer
        const configID = getCredentialConfigurationIds(resolvedCredentialOffer)?.[0]
        const tokenEndpoint = resolvedCredentialOffer.metadata.token_endpoint
        const issuerMetadata = resolvedCredentialOffer.metadata.credentialIssuerMetadata
        const credentialEndpoint = resolvedCredentialOffer.metadata.credential_endpoint

        if (refreshToken && authServer && configID) {
          setRefreshCredentialMetadata(credentialRecord, {
            authServer: authServer,
            tokenEndpoint: tokenEndpoint,
            refreshToken: refreshToken,
            issuerMetadataCache: {
              credential_issuer: credentialIssuer,
              credential_endpoint: credentialEndpoint,
              token_endpoint: tokenEndpoint,
              authorization_servers: authServers,
              credential_configurations_supported: issuerMetadata?.credential_configurations_supported,
            },
            credentialIssuer: credentialIssuer,
            credentialConfigurationId: configID,
            lastCheckedAt: Date.now(),
            lastCheckResult: RefreshStatus.Valid,
            attemptCount: 0,
            resolvedCredentialOffer: resolvedCredentialOffer,
          })
        }

        await acceptNewCredential(credentialRecord)
        await handleSendNotification(NotificationEventType.CREDENTIAL_ACCEPTED)
        setAcceptModalVisible(true)
        return
      }

      if (!issuedCredential) {
        return
      }

      await acceptNewCredential(issuedCredential)
      await handleSendNotification(NotificationEventType.CREDENTIAL_ACCEPTED)
      setAcceptModalVisible(true)
    } catch (err: unknown) {
      setButtonsVisible(true)
      const error = new BifoldError(t('Error.Title1024'), t('Error.Message1024'), (err as Error)?.message ?? err, 1024)
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
    }
  }

  const footerButton = (
    title: string,
    buttonPress: () => void,
    buttonType: ButtonType,
    testID: string,
    accessibilityLabel: string
  ) => {
    return (
      <View style={styles.footerButton}>
        <Button
          title={title}
          accessibilityLabel={accessibilityLabel}
          testID={testID}
          buttonType={buttonType}
          onPress={buttonPress}
          disabled={!buttonsVisible}
        />
      </View>
    )
  }

  const renderOpenIdCard = () => {
    if (!credentialDisplay || !issuedCredential) return null
    return (
      <CredentialCard
        credential={issuedCredential}
        brandingOverlay={overlay}
      />
    )
  }

  const header = () => {
    return (
      <>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerText} testID={testIdWithKey('HeaderText')}>
            <Text>{issuerName}</Text> {t('CredentialOffer.IsOfferingYouACredential')}
          </Text>
        </View>
        {issuedCredential && (
          <View style={{ marginHorizontal: 15, marginBottom: 16 }}>{renderOpenIdCard()}</View>
        )}
      </>
    )
  }

  const footer = () => {
    const paddingHorizontal = 24
    const paddingVertical = 16
    const paddingBottom = 26
    return (
      <View style={{ marginBottom: 50 }}>
        <View
          style={{
            paddingHorizontal: paddingHorizontal,
            paddingVertical: paddingVertical,
            paddingBottom: paddingBottom,
            backgroundColor: ColorPalette.brand.secondaryBackground,
          }}
        >
          {isPendingCredentialOffer && (
            <View style={styles.txCodeContainer}>
              <Text style={styles.txCodeLabel}>Transaction code</Text>
              <TextInput
                ref={txCodeInputRef}
                style={styles.txCodeInput}
                value={txCode}
                onChangeText={(value) => {
                  setTxCode(value)
                  if (txCodeError) {
                    setTxCodeError(undefined)
                  }
                }}
                placeholder="Enter transaction code"
                autoCapitalize="characters"
                autoCorrect={false}
                keyboardType="default"
                maxLength={pendingOffer?.txCode?.length}
                blurOnSubmit={false}
                returnKeyType="done"
                autoFocus
                onBlur={() => {
                  const expectedLength = pendingOffer?.txCode?.length
                  if (!expectedLength) {
                    return
                  }
                  const currentLength = txCode.replace(/\s+/g, '').length
                  if (currentLength < expectedLength) {
                    setTimeout(() => txCodeInputRef.current?.focus(), 50)
                  }
                }}
              />
              {pendingOffer?.txCode?.description && (
                <Text style={styles.txCodeHelpText}>{pendingOffer.txCode.description}</Text>
              )}
              {txCodeError && <Text style={styles.txCodeErrorText}>{txCodeError}</Text>}
            </View>
          )}
          {footerButton(
            t('Global.Accept'),
            handleAcceptTouched,
            ButtonType.Primary,
            testIdWithKey('AcceptCredentialOffer'),
            t('Global.Accept')
          )}
          {footerButton(
            t('Global.Decline'),
            toggleDeclineModalVisible,
            ButtonType.Secondary,
            testIdWithKey('DeclineCredentialOffer'),
            t('Global.Decline')
          )}
        </View>
      </View>
    )
  }

  return (
    <ScreenLayout screen={Screens.OpenIDCredentialDetails}>
      {isPendingCredentialOffer ? (
        <>
          {header()}
          {footer()}
        </>
      ) : (
        <Record fields={overlay.presentationFields || []} hideFieldValues header={header} footer={footer} />
      )}
      <CredentialOfferAccept visible={acceptModalVisible} credentialId={''} confirmationOnly={true} />
      <CommonRemoveModal
        usage={ModalUsage.CredentialOfferDecline}
        visible={isRemoveModalDisplayed}
        onSubmit={handleDeclineTouched}
        onCancel={toggleDeclineModalVisible}
        extraDetails={issuerName}
      />
    </ScreenLayout>
  )
}

export default OpenIDCredentialOffer
