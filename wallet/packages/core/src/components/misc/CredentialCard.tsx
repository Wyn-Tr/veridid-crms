import { CredentialExchangeRecord, MdocRecord, SdJwtVcRecord, W3cCredentialRecord } from '@credo-ts/core'
import { Attribute, BrandingOverlayType, CredentialOverlay, Predicate } from '@bifold/oca/build/legacy'
import React, { useEffect, useState } from 'react'
import { ViewStyle } from 'react-native'

import { TOKENS, useServices } from '../../container-api'
import { useTheme } from '../../contexts/theme'
import { GenericFn } from '../../types/fn'

import CredentialCard10 from './CredentialCard10'
import CredentialCard11 from './CredentialCard11'
import { CredentialErrors, GenericCredentialExchangeRecord } from '../../types/credentials'
import { BrandingOverlay } from '@bifold/oca'
import { useOpenIDCredentials } from '../../modules/openid/context/OpenIDCredentialRecordProvider'
import { getCredentialForDisplay } from '../../modules/openid/display'
import { getAttributeField } from '../../utils/oca'
import { useCredentialErrorsFromRegistry } from '../../modules/openid/hooks/useCredentialErrorsFromRegistry'
import { useAgent } from '@credo-ts/react-hooks'
import { ensureCredentialMetadata } from '../../utils/credential'

interface CredentialCardProps {
  credential?: GenericCredentialExchangeRecord
  credDefId?: string
  schemaId?: string
  credName?: string
  onPress?: GenericFn
  style?: ViewStyle
  proof?: boolean
  displayItems?: (Attribute | Predicate)[]
  hasAltCredentials?: boolean
  credentialErrors?: CredentialErrors[]
  handleAltCredChange?: () => void
  brandingOverlay?: CredentialOverlay<BrandingOverlay>
}

const CredentialCard: React.FC<CredentialCardProps> = ({
  credential,
  credDefId,
  schemaId,
  proof,
  displayItems,
  credName,
  hasAltCredentials,
  handleAltCredChange,
  style = {},
  onPress = undefined,
  credentialErrors,
  brandingOverlay,
}) => {
  // add ability to reference credential by ID, allows us to get past react hook restrictions
  const [bundleResolver] = useServices([TOKENS.UTIL_OCA_RESOLVER])
  const { ColorPalette } = useTheme()
  const [overlay, setOverlay] = useState<CredentialOverlay<BrandingOverlay>>({})
  const { resolveBundleForCredential } = useOpenIDCredentials()
  const [extraOverlayAttribute, setExtraOverlayAttribute] = useState<Attribute | undefined>()
  const computedErrors = useCredentialErrorsFromRegistry(credential, credentialErrors)
  const { agent } = useAgent()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [metadataVersion, setMetadataVersion] = useState(0)

  useEffect(() => {
    if (brandingOverlay) {
      setOverlay(brandingOverlay as unknown as CredentialOverlay<BrandingOverlay>)
      return
    }

    const resolveOverlay = async (w3cCred: W3cCredentialRecord | SdJwtVcRecord | MdocRecord) => {
      const brandingOverlay = await resolveBundleForCredential(w3cCred)
      setOverlay(brandingOverlay)
    }

    if (
      credential instanceof W3cCredentialRecord ||
      credential instanceof SdJwtVcRecord ||
      credential instanceof MdocRecord
    ) {
      const credentialDisplay = getCredentialForDisplay(credential)
      resolveOverlay(credential)
      if (credentialDisplay.display.primary_overlay_attribute) {
        const attributeValue = getAttributeField(
          credentialDisplay,
          credentialDisplay.display.primary_overlay_attribute
        )?.field
        setExtraOverlayAttribute(attributeValue)
      }
    }
  }, [credential, brandingOverlay, resolveBundleForCredential])

  useEffect(() => {
    if (!credential || !(credential instanceof CredentialExchangeRecord) || !agent) return
    ensureCredentialMetadata(credential, agent, undefined, logger)
      .then((updated) => {
        if (updated) setMetadataVersion((prev) => prev + 1)
      })
      .catch(() => undefined)
  }, [credential, agent, logger])

  const getCredOverlayType = (type: BrandingOverlayType) => {
    const isBranding10 = bundleResolver.getBrandingOverlayType() === BrandingOverlayType.Branding10
    if (proof) {
      return (
        <CredentialCard11
          displayItems={displayItems}
          style={isBranding10 ? { backgroundColor: ColorPalette.brand.secondaryBackground } : undefined}
          credName={credName}
          credDefId={credDefId}
          schemaId={schemaId}
          credential={credential as CredentialExchangeRecord}
          handleAltCredChange={handleAltCredChange}
          hasAltCredentials={hasAltCredentials}
          proof
          elevated
          credentialErrors={credentialErrors ?? []}
          brandingOverlayType={bundleResolver.getBrandingOverlayType()}
        />
      )
    }

    if (credential) {
      if (type === BrandingOverlayType.Branding01) {
        return (
          <CredentialCard10
            key={`cred-${credential.id}-${metadataVersion}`}
            credential={credential as CredentialExchangeRecord}
            style={style}
            onPress={onPress}
          />
        )
      } else {
        return (
          <CredentialCard11
            key={`cred-${credential.id}-${metadataVersion}`}
            credential={credential as CredentialExchangeRecord}
            style={style}
            onPress={onPress}
            credentialErrors={credentialErrors ?? []}
            brandingOverlayType={bundleResolver.getBrandingOverlayType()}
            elevated={bundleResolver.getBrandingOverlayType() === BrandingOverlayType.Branding11}
          />
        )
      }
    } else {
      return (
        <CredentialCard11
          key={`cred-unknown-${metadataVersion}`}
          credDefId={credDefId}
          schemaId={schemaId}
          credName={credName}
          displayItems={displayItems}
          style={style}
          onPress={onPress}
          credentialErrors={credentialErrors ?? []}
          brandingOverlayType={bundleResolver.getBrandingOverlayType()}
        />
      )
    }
  }

  if (
    credential instanceof W3cCredentialRecord ||
    credential instanceof SdJwtVcRecord ||
    credential instanceof MdocRecord
  ) {
    return (
      <CredentialCard11
        credential={undefined}
        style={style}
        onPress={onPress}
        brandingOverlay={overlay}
        credentialErrors={computedErrors}
        proof={proof}
        elevated={proof}
        displayItems={displayItems}
        hideSlice={true}
        hasAltCredentials={hasAltCredentials}
        handleAltCredChange={handleAltCredChange}
        extraOverlayParameter={extraOverlayAttribute}
        brandingOverlayType={bundleResolver.getBrandingOverlayType()}
      />
    )
  } else {
    return getCredOverlayType(bundleResolver.getBrandingOverlayType())
  }
}

export default CredentialCard
