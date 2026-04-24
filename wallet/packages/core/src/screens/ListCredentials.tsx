import { AnonCredsCredentialMetadataKey } from '@credo-ts/anoncreds'
import { CredentialExchangeRecord, CredentialState, SdJwtVcRecord, W3cCredentialRecord } from '@credo-ts/core'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'
import { useCredentialByState } from '@credo-ts/react-hooks'
import { useNavigation, useIsFocused } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, View } from 'react-native'

import CredentialCard from '../components/misc/CredentialCard'
import OpenBadgeCard from '../modules/openid/components/OpenBadgeCard'
import { getCredentialForDisplay, isOpenBadgeCredential } from '../modules/openid/display'
import { DispatchAction } from '../contexts/reducers/store'
import { useStore } from '../contexts/store'
import { useTheme } from '../contexts/theme'
import { useTour } from '../contexts/tour/tour-context'
import { RootStackParams, Screens } from '../types/navigators'
import { TOKENS, useServices } from '../container-api'
import { EmptyListProps } from '../components/misc/EmptyList'
import { CredentialListFooterProps } from '../types/credential-list-footer'
import { useOpenIDCredentials } from '../modules/openid/context/OpenIDCredentialRecordProvider'
import { CredentialErrors, GenericCredentialExchangeRecord } from '../types/credentials'
import { BaseTourID } from '../types/tour'
import { OpenIDCredentialType } from '../modules/openid/types'

const ListCredentials: React.FC = () => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore()
  const [
    CredentialListOptions,
    credentialEmptyList,
    credentialListFooter,
    { enableTours: enableToursConfig, credentialHideList },
  ] = useServices([
    TOKENS.COMPONENT_CRED_LIST_OPTIONS,
    TOKENS.COMPONENT_CRED_EMPTY_LIST,
    TOKENS.COMPONENT_CRED_LIST_FOOTER,
    TOKENS.CONFIG,
  ])
  const navigation = useNavigation<StackNavigationProp<RootStackParams>>()
  const { ColorPalette } = useTheme()
  const { start, stop } = useTour()
  const screenIsFocused = useIsFocused()
  const {
    openIdState: { w3cCredentialRecords, sdJwtVcRecords, openBadgeCredentialRecords },
  } = useOpenIDCredentials()

  let credentials: GenericCredentialExchangeRecord[] = [
    ...useCredentialByState(CredentialState.CredentialReceived),
    ...useCredentialByState(CredentialState.Done),
    ...w3cCredentialRecords,
    ...sdJwtVcRecords,
    ...(openBadgeCredentialRecords as any[]),
  ]

  const CredentialEmptyList = credentialEmptyList as React.FC<EmptyListProps>
  const CredentialListFooter = credentialListFooter as React.FC<CredentialListFooterProps>

  // Filter out hidden credentials when not in dev mode
  if (!store.preferences.developerModeEnabled) {
    credentials = credentials.filter((r) => {
      const credDefId = r.metadata.get(AnonCredsCredentialMetadataKey)?.credentialDefinitionId
      return !credentialHideList?.includes(credDefId)
    })
  }

  useEffect(() => {
    const shouldShowTour = enableToursConfig && store.tours.enableTours && !store.tours.seenCredentialsTour

    if (shouldShowTour && screenIsFocused) {
      start(BaseTourID.CredentialsTour)
      dispatch({
        type: DispatchAction.UPDATE_SEEN_CREDENTIALS_TOUR,
        payload: [true],
      })
    }
  }, [enableToursConfig, store.tours.enableTours, store.tours.seenCredentialsTour, screenIsFocused, start, dispatch])

  // stop the tour when the screen unmounts
  useEffect(() => {
    return stop
  }, [stop])

  const renderCardItem = (cred: GenericCredentialExchangeRecord) => {
    // Check if this is an OpenBadgeCredentialRecord from DIDComm
    if ((cred as any) instanceof OpenBadgeCredentialRecord) {
      const obRecord = cred as unknown as OpenBadgeCredentialRecord
      const credential = obRecord.credential as any
      const subject = Array.isArray(credential?.credentialSubject)
        ? credential.credentialSubject[0]
        : credential?.credentialSubject
      const achievement = subject?.achievement
      const issuer = typeof credential?.issuer === 'string'
        ? { name: credential.issuer }
        : credential?.issuer

      return (
        <OpenBadgeCard
          credentialDisplay={{
            id: obRecord.id,
            credential: credential,
            display: {
              name: achievement?.name || obRecord.derived?.title || 'Badge',
              issuer: { name: issuer?.name || obRecord.derived?.issuerName || 'Issuer' },
              logo: achievement?.image?.id ? { url: achievement.image.id } : undefined,
            },
            createdAt: obRecord.createdAt?.toISOString() || '',
            attributes: [],
            metadata: {},
          } as any}
          onPress={() => {
            navigation.navigate(Screens.OpenBadgeDetails, {
              credentialId: obRecord.id,
            })
          }}
        />
      )
    }

    // Check if this is an OpenBadge credential in W3cCredentialRecord
    if (cred instanceof W3cCredentialRecord) {
      const credDisplay = getCredentialForDisplay(cred)
      if (credDisplay.credential && isOpenBadgeCredential(credDisplay.credential)) {
        return (
          <OpenBadgeCard
            credentialDisplay={credDisplay}
            credentialRecord={cred}
            onPress={() => {
              navigation.navigate(Screens.OpenBadgeDetails, {
                credentialId: cred.id,
              })
            }}
          />
        )
      }
    }

    return (
      <CredentialCard
        credential={cred as CredentialExchangeRecord}
        credentialErrors={
          (cred as CredentialExchangeRecord).revocationNotification?.revocationDate && [CredentialErrors.Revoked]
        }
        onPress={() => {
          if (cred instanceof W3cCredentialRecord) {
            navigation.navigate(Screens.OpenIDCredentialDetails, {
              credentialId: cred.id,
              type: OpenIDCredentialType.W3cCredential,
            })
          } else if (cred instanceof SdJwtVcRecord) {
            navigation.navigate(Screens.OpenIDCredentialDetails, {
              credentialId: cred.id,
              type: OpenIDCredentialType.SdJwtVc,
            })
          } else {
            navigation.navigate(Screens.CredentialDetails, { credentialId: cred.id })
          }
        }}
      />
    )
  }

  return (
    <View>
      <FlatList
        style={{ backgroundColor: ColorPalette.brand.primaryBackground }}
        data={credentials.sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf())}
        keyExtractor={(credential) => credential.id}
        renderItem={({ item: credential, index }) => {
          return (
            <View
              style={{
                marginHorizontal: 15,
                marginTop: 15,
                marginBottom: index === credentials.length - 1 ? 45 : 0,
              }}
            >
              {renderCardItem(credential)}
            </View>
          )
        }}
        ListEmptyComponent={() => <CredentialEmptyList message={t('Credentials.EmptyList')} />}
        ListFooterComponent={() => <CredentialListFooter credentialsCount={credentials.length} />}
      />
      <CredentialListOptions />
    </View>
  )
}

export default ListCredentials
