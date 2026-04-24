import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react'

import { BrandingOverlay } from '@bifold/oca'
import { BrandingOverlayType, CredentialOverlay, OCABundleResolveAllParams } from '@bifold/oca/build/legacy'
import {
  ClaimFormat,
  MdocRecord,
  MdocRepository,
  SdJwtVcRecord,
  SdJwtVcRepository,
  W3cCredentialRecord,
  W3cCredentialRepository,
} from '@credo-ts/core'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'
import { useAgent } from '@credo-ts/react-hooks'
import { recordsAddedByType, recordsRemovedByType } from '@credo-ts/react-hooks/build/recordUtils'
import { useTranslation } from 'react-i18next'
import { TOKENS, useServices } from '../../../container-api'
import { buildFieldsFromW3cCredsCredential } from '../../../utils/oca'
import { getCredentialForDisplay } from '../display'
import { getOpenId4VcCredentialMetadata } from '../metadata'
import { OpenIDCredentialType } from '../types'

type OpenIDCredentialRecord = W3cCredentialRecord | SdJwtVcRecord | MdocRecord | undefined

export type OpenIDCredentialContext = {
  openIdState: OpenIDCredentialRecordState
  getW3CCredentialById: (id: string) => Promise<W3cCredentialRecord | undefined>
  getSdJwtCredentialById: (id: string) => Promise<SdJwtVcRecord | undefined>
  getMdocCredentialById: (id: string) => Promise<MdocRecord | undefined>
  getOpenBadgeCredentialById: (id: string) => Promise<OpenBadgeCredentialRecord | undefined>
  storeCredential: (cred: W3cCredentialRecord | SdJwtVcRecord | MdocRecord) => Promise<void>
  removeCredential: (
    cred: W3cCredentialRecord | SdJwtVcRecord | MdocRecord | OpenBadgeCredentialRecord,
    type: OpenIDCredentialType
  ) => Promise<void>
  resolveBundleForCredential: (
    credential: SdJwtVcRecord | W3cCredentialRecord | MdocRecord
  ) => Promise<CredentialOverlay<BrandingOverlay>>
}

export type OpenIDCredentialRecordState = {
  openIDCredentialRecords: Array<OpenIDCredentialRecord>
  w3cCredentialRecords: Array<W3cCredentialRecord>
  sdJwtVcRecords: Array<SdJwtVcRecord>
  mdocVcRecords: Array<MdocRecord>
  openBadgeCredentialRecords: Array<OpenBadgeCredentialRecord>
  isLoading: boolean
}

const addW3cRecord = (record: W3cCredentialRecord, state: OpenIDCredentialRecordState): OpenIDCredentialRecordState => {
  const newRecordsState = [...state.w3cCredentialRecords]
  newRecordsState.unshift(record)

  return {
    ...state,
    w3cCredentialRecords: newRecordsState,
  }
}

const removeW3cRecord = (
  record: W3cCredentialRecord,
  state: OpenIDCredentialRecordState
): OpenIDCredentialRecordState => {
  const newRecordsState = [...state.w3cCredentialRecords]
  const index = newRecordsState.findIndex((r) => r.id === record.id)
  if (index > -1) {
    newRecordsState.splice(index, 1)
  }

  return {
    ...state,
    w3cCredentialRecords: newRecordsState,
  }
}

const addSdJwtRecord = (record: SdJwtVcRecord, state: OpenIDCredentialRecordState): OpenIDCredentialRecordState => {
  const newRecordsState = [...state.sdJwtVcRecords]
  newRecordsState.unshift(record)

  return {
    ...state,
    sdJwtVcRecords: newRecordsState,
  }
}

const removeSdJwtRecord = (record: SdJwtVcRecord, state: OpenIDCredentialRecordState): OpenIDCredentialRecordState => {
  const newRecordsState = [...state.sdJwtVcRecords]
  const index = newRecordsState.findIndex((r) => r.id === record.id)
  if (index > -1) {
    newRecordsState.splice(index, 1)
  }

  return {
    ...state,
    sdJwtVcRecords: newRecordsState,
  }
}

const addOpenBadgeRecord = (record: OpenBadgeCredentialRecord, state: OpenIDCredentialRecordState): OpenIDCredentialRecordState => {
  const newRecordsState = [...state.openBadgeCredentialRecords]
  newRecordsState.unshift(record)

  return {
    ...state,
    openBadgeCredentialRecords: newRecordsState,
  }
}

const removeOpenBadgeRecord = (record: OpenBadgeCredentialRecord, state: OpenIDCredentialRecordState): OpenIDCredentialRecordState => {
  const newRecordsState = [...state.openBadgeCredentialRecords]
  const index = newRecordsState.findIndex((r) => r.id === record.id)
  if (index > -1) {
    newRecordsState.splice(index, 1)
  }

  return {
    ...state,
    openBadgeCredentialRecords: newRecordsState,
  }
}

const defaultState: OpenIDCredentialRecordState = {
  openIDCredentialRecords: [],
  w3cCredentialRecords: [],
  sdJwtVcRecords: [],
  mdocVcRecords: [],
  openBadgeCredentialRecords: [],
  isLoading: true,
}

interface OpenIDCredentialProviderProps {
  children: React.ReactNode
}

const OpenIDCredentialRecordContext = createContext<OpenIDCredentialContext>(null as unknown as OpenIDCredentialContext)

const isW3CCredentialRecord = (record: W3cCredentialRecord) => {
  return record.getTags()?.claimFormat === ClaimFormat.JwtVc
}

const isSdJwtCredentialRecord = (record: SdJwtVcRecord) => {
  return 'compactSdJwtVc' in record
}

const filterW3CCredentialsOnly = (credentials: W3cCredentialRecord[]) => {
  return credentials.filter((r) => isW3CCredentialRecord(r))
}

const filterSdJwtCredentialsOnly = (credentials: SdJwtVcRecord[]) => {
  return credentials.filter((r) => isSdJwtCredentialRecord(r))
}

// eslint-disable-next-line react/prop-types
export const OpenIDCredentialRecordProvider: React.FC<PropsWithChildren<OpenIDCredentialProviderProps>> = ({
  children,
}: OpenIDCredentialProviderProps) => {
  const [state, setState] = useState<OpenIDCredentialRecordState>(defaultState)

  const { agent } = useAgent()
  const [logger, bundleResolver] = useServices([TOKENS.UTIL_LOGGER, TOKENS.UTIL_OCA_RESOLVER])
  const { i18n } = useTranslation()

  function checkAgent() {
    if (!agent) {
      const error = 'Agent undefined!'
      logger.error(`[OpenIDCredentialRecordProvider] ${error}`)
      throw new Error(error)
    }
  }

  async function getW3CCredentialById(id: string): Promise<W3cCredentialRecord | undefined> {
    checkAgent()
    return await agent?.w3cCredentials.getCredentialRecordById(id)
  }

  async function getSdJwtCredentialById(id: string): Promise<SdJwtVcRecord | undefined> {
    checkAgent()
    return await agent?.sdJwtVc.getById(id)
  }

  async function getMdocCredentialById(id: string): Promise<MdocRecord | undefined> {
    checkAgent()
    return await agent?.mdoc.getById(id)
  }

  async function getOpenBadgeCredentialById(id: string): Promise<OpenBadgeCredentialRecord | undefined> {
    checkAgent()
    const openbadgesApi = (agent?.modules as any)?.openbadges
    if (openbadgesApi?.getCredentialById) {
      return await openbadgesApi.getCredentialById(id)
    }
    return undefined
  }

  async function storeCredential(cred: W3cCredentialRecord | SdJwtVcRecord | MdocRecord): Promise<void> {
    checkAgent()
    if (cred instanceof W3cCredentialRecord) {
      await agent?.dependencyManager.resolve(W3cCredentialRepository).save(agent.context, cred)
    } else if (cred instanceof SdJwtVcRecord) {
      await agent?.dependencyManager.resolve(SdJwtVcRepository).save(agent.context, cred)
    } else if (cred instanceof MdocRecord) {
      await agent?.dependencyManager.resolve(MdocRepository).save(agent.context, cred)
    }
  }

  async function deleteCredential(cred: W3cCredentialRecord | SdJwtVcRecord | MdocRecord | OpenBadgeCredentialRecord, type: OpenIDCredentialType) {
    checkAgent()
    if (type === OpenIDCredentialType.W3cCredential) {
      await agent?.w3cCredentials.removeCredentialRecord(cred.id)
    } else if (type === OpenIDCredentialType.SdJwtVc) {
      await agent?.sdJwtVc.deleteById(cred.id)
    } else if (type === OpenIDCredentialType.Mdoc) {
      await agent?.mdoc.deleteById(cred.id)
    } else if (type === OpenIDCredentialType.OpenBadge) {
      const openbadgesApi = (agent?.modules as any)?.openbadges
      if (openbadgesApi?.deleteCredential) {
        await openbadgesApi.deleteCredential(cred.id)
      }
    }
  }

  const resolveBundleForCredential = async (
    credential: SdJwtVcRecord | W3cCredentialRecord | MdocRecord
  ): Promise<CredentialOverlay<BrandingOverlay>> => {
    const credentialDisplay = getCredentialForDisplay(credential)
    const openIdMetadata = getOpenId4VcCredentialMetadata(credential)
    const credentialConfigurationId = openIdMetadata?.credentialConfigurationId


    const params: OCABundleResolveAllParams = {
      identifiers: {
        schemaId: '',
        credentialDefinitionId: credentialConfigurationId ?? credentialDisplay.id,
      },
      meta: {
        alias: credentialDisplay.display.issuer.name,
        credConnectionId: undefined,
        credName: credentialDisplay.display.name,
      },
      attributes: buildFieldsFromW3cCredsCredential(credentialDisplay),
      language: i18n.language,
    }

    const [bundle] = await Promise.all([bundleResolver.resolveAllBundles(params)])
    const _bundle = bundle as CredentialOverlay<BrandingOverlay>

    const fallbackBrandingOverlay: BrandingOverlay = new BrandingOverlay('none', {
      capture_base: 'none',
      type: bundleResolver.getBrandingOverlayType(),
      primary_background_color: credentialDisplay.display.backgroundColor,
      background_image: credentialDisplay.display.backgroundImage?.url,
      logo: credentialDisplay.display.logo?.url,
    })

    const mergeBrandingOverlay = (overlay?: BrandingOverlay): BrandingOverlay => {
      if (!overlay) return fallbackBrandingOverlay

      return new BrandingOverlay('none', {
        capture_base: 'none',
        type: bundleResolver.getBrandingOverlayType(),
        primary_background_color: overlay.primaryBackgroundColor ?? fallbackBrandingOverlay.primaryBackgroundColor,
        secondary_background_color: overlay.secondaryBackgroundColor ?? fallbackBrandingOverlay.secondaryBackgroundColor,
        background_image: overlay.backgroundImage ?? fallbackBrandingOverlay.backgroundImage,
        background_image_slice: overlay.backgroundImageSlice ?? fallbackBrandingOverlay.backgroundImageSlice,
        logo: overlay.logo ?? fallbackBrandingOverlay.logo,
        primary_attribute: overlay.primaryAttribute ?? fallbackBrandingOverlay.primaryAttribute,
        secondary_attribute: overlay.secondaryAttribute ?? fallbackBrandingOverlay.secondaryAttribute,
        issued_date_attribute: overlay.issuedDateAttribute ?? fallbackBrandingOverlay.issuedDateAttribute,
        expiry_date_attribute: overlay.expiryDateAttribute ?? fallbackBrandingOverlay.expiryDateAttribute,
      })
    }

    const preferredOverlay = _bundle.brandingOverlay

    const ocaBundle: CredentialOverlay<BrandingOverlay> = {
      ..._bundle,
      presentationFields: bundle.presentationFields,
      brandingOverlay: mergeBrandingOverlay(preferredOverlay),
    }

    return ocaBundle
  }

  useEffect(() => {
    if (!agent) return

    agent.w3cCredentials?.getAllCredentialRecords().then((w3cCredentialRecords) => {
      setState((prev) => ({
        ...prev,
        w3cCredentialRecords: filterW3CCredentialsOnly(w3cCredentialRecords),
        isLoading: false,
      }))
    })

    agent.sdJwtVc?.getAll().then((creds) => {
      setState((prev) => ({
        ...prev,
        sdJwtVcRecords: filterSdJwtCredentialsOnly(creds),
        isLoading: false,
      }))
    })

    // Load OpenBadge credentials from DIDComm protocol
    const openbadgesApi = (agent.modules as any).openbadges
    if (openbadgesApi?.getAllCredentials) {
      openbadgesApi.getAllCredentials().then((openBadgeRecords: OpenBadgeCredentialRecord[]) => {
        setState((prev) => ({
          ...prev,
          openBadgeCredentialRecords: openBadgeRecords || [],
        }))
      }).catch((err: any) => {
        logger.warn('[OpenIDCredentialRecordProvider] Failed to load OpenBadge credentials:', err)
      })
    }
  }, [agent])

  useEffect(() => {
    if (state.isLoading) return
    if (!agent?.events?.observable) return

    const w3c_credentialAdded$ = recordsAddedByType(agent, W3cCredentialRecord).subscribe((record) => {
      //This handler will return ANY creds added to the wallet even DidComm
      //Sounds like a bug in the hooks package
      //This check will safe guard the flow untill a fix goes to the hooks
      if (isW3CCredentialRecord(record)) {
        setState(addW3cRecord(record, state))
      }
    })

    const w3c_credentialRemoved$ = recordsRemovedByType(agent, W3cCredentialRecord).subscribe((record) => {
      setState(removeW3cRecord(record, state))
    })

    const sdjwt_credentialAdded$ = recordsAddedByType(agent, SdJwtVcRecord).subscribe((record) => {
      //This handler will return ANY creds added to the wallet even DidComm
      //Sounds like a bug in the hooks package
      //This check will safe guard the flow untill a fix goes to the hooks
      setState(addSdJwtRecord(record, state))
      // if (isW3CCredentialRecord(record)) {
      //   setState(addW3cRecord(record, state))
      // }
    })

    const sdjwt_credentialRemoved$ = recordsRemovedByType(agent, SdJwtVcRecord).subscribe((record) => {
      setState(removeSdJwtRecord(record, state))
    })

    // OpenBadge credential events
    const openbadge_credentialAdded$ = recordsAddedByType(agent, OpenBadgeCredentialRecord).subscribe((record) => {
      setState(addOpenBadgeRecord(record, state))
    })

    const openbadge_credentialRemoved$ = recordsRemovedByType(agent, OpenBadgeCredentialRecord).subscribe((record) => {
      setState(removeOpenBadgeRecord(record, state))
    })

    return () => {
      w3c_credentialAdded$.unsubscribe()
      w3c_credentialRemoved$.unsubscribe()
      sdjwt_credentialAdded$.unsubscribe()
      sdjwt_credentialRemoved$.unsubscribe()
      openbadge_credentialAdded$.unsubscribe()
      openbadge_credentialRemoved$.unsubscribe()
    }
  }, [state, agent])

  return (
    <OpenIDCredentialRecordContext.Provider
      value={{
        openIdState: state,
        storeCredential: storeCredential,
        removeCredential: deleteCredential,
        getW3CCredentialById: getW3CCredentialById,
        getSdJwtCredentialById: getSdJwtCredentialById,
        getMdocCredentialById: getMdocCredentialById,
        getOpenBadgeCredentialById: getOpenBadgeCredentialById,
        resolveBundleForCredential: resolveBundleForCredential,
      }}
    >
      {children}
    </OpenIDCredentialRecordContext.Provider>
  )
}

export const useOpenIDCredentials = () => useContext(OpenIDCredentialRecordContext)
