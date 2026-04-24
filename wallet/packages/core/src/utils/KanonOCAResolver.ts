import { Agent } from '@credo-ts/core'
import {
  DefaultOCABundleResolver,
  OCABundle,
  OCABundleResolveAllParams,
  OCABundleResolverOptions,
  Identifiers,
  CredentialOverlay,
} from '@bifold/oca/build/legacy'
import { BrandingOverlay } from '@bifold/oca'
import { EthereumLedgerService } from 'kanon-react-native'

export interface KanonOCABundleResolverOptions extends OCABundleResolverOptions {}

/**
 * Custom OCA Bundle Resolver that extends DefaultOCABundleResolver
 * to support fetching OCA overlays from Kanon credential definitions.
 *
 * When a credential definition ID is not found in the local bundle,
 * it attempts to fetch the overlay from the credential definition metadata.
 */
export class KanonOCABundleResolver extends DefaultOCABundleResolver {
  private agent: Agent | null = null
  private cachedOverlays: Map<string, OCABundle> = new Map()

  constructor(bundle?: Record<string, unknown>, options?: KanonOCABundleResolverOptions) {
    super(bundle as any, options)
  }

  /**
   * Set the agent instance for fetching credential definitions
   */
  public setAgent(agent: Agent) {
    this.agent = agent
  }

  /**
   * Resolve OCA bundle - first tries local bundle, then fetches from Kanon if not found
   */
  public async resolve(params: { identifiers: Identifiers; language?: string }): Promise<OCABundle | undefined> {
    const credDefId = params.identifiers.credentialDefinitionId
    console.info('[KanonOCAResolver] resolve', { credDefId })

    // First try the default resolver (local bundles)
    const localBundle = await super.resolve(params)
    if (localBundle) {
      return localBundle
    }

    // Check cache
    if (credDefId && this.cachedOverlays.has(credDefId)) {
      return this.cachedOverlays.get(credDefId)
    }

    // Try to fetch from Kanon credential definition
    if (credDefId && this.agent) {
      try {
        const kanonBundle = await this.fetchKanonOCA(credDefId, params.language)
        if (kanonBundle) {
          this.cachedOverlays.set(credDefId, kanonBundle)
          return kanonBundle
        }
      } catch (error) {
        // Silently fail - credential will use default overlay
      }
    }

    return undefined
  }

  /**
   * Fetch OCA overlay from Kanon credential definition metadata
   */
  private async fetchKanonOCA(credDefId: string, language?: string): Promise<OCABundle | undefined> {
    if (!this.agent) {
      console.info('[KanonOCAResolver] No agent available for ledger fetch', { credDefId })
      return undefined
    }

    try {
      console.info('[KanonOCAResolver] getCredentialDefinition start', { credDefId })
      const start = Date.now()
      const timeoutMs = 8000
      const result = await Promise.race([
        this.agent.modules.anoncreds.getCredentialDefinition(credDefId),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`getCredentialDefinition timeout after ${timeoutMs}ms`)), timeoutMs)
        ),
      ])
      console.info('[KanonOCAResolver] getCredentialDefinition done', {
        credDefId,
        ms: Date.now() - start,
        hasResult: !!result,
      })

      const raw = result as any

      const normalizeRaw = (input: any): any => {
        if (!Array.isArray(input)) return input
        for (const item of input) {
          if (typeof item === 'string' && item.includes('"overlay"')) {
            try {
              return JSON.parse(item)
            } catch {
              // ignore parse errors
            }
          }
        }
        return input
      }

      const normalizedRaw = normalizeRaw(raw)
      const credDef = normalizedRaw?.credentialDefinition ?? normalizedRaw?.data ?? normalizedRaw
      const meta = normalizedRaw?.credentialDefinitionMetadata ?? normalizedRaw?.metadata

      const issuerId = credDef?.issuerId || credDef?.issuer || normalizedRaw?.issuerId
      const schemaId = credDef?.schemaId || credDef?.data?.schemaId
      const tag = credDef?.tag || credDef?.data?.tag
      const internalId = credDef?.id || credDef?.data?.id || normalizedRaw?.id
      const createdAt = credDef?.createdAt || meta?.createdAt || meta?.created_at
      const updatedAt = credDef?.updatedAt || meta?.updatedAt || meta?.updated_at

      console.info('[KanonOCAResolver] Credential Definition Details', {
        credentialDefinitionId: credDefId,
        internalId,
        issuerId,
        schemaId,
        tag,
        method: 'kanon',
        createdAt,
        updatedAt,
      })

      if (schemaId) {
        try {
          const schemaResult = await this.agent.modules.anoncreds.getSchema(schemaId)
          const schema = (schemaResult as any)?.schema
          console.info('[KanonOCAResolver] Schema Details', {
            schemaId,
            internalId: schema?.id,
            name: schema?.name,
            version: schema?.version,
            issuerId: schema?.issuerId || schema?.issuer,
            method: 'kanon',
            createdAt: schema?.createdAt,
            updatedAt: schema?.updatedAt,
            attributes: schema?.attrNames || schema?.attributes,
          })
        } catch (schemaError) {
          console.info('[KanonOCAResolver] Failed to fetch schema details', { schemaId, schemaError })
        }
      }

      // Check for overlay in metadata or credential definition value
      const overlay =
        normalizedRaw?.credentialDefinitionMetadata?.overlay ||
        normalizedRaw?.credentialDefinition?.overlay ||
        normalizedRaw?.credentialDefinition?.data?.overlay ||
        normalizedRaw?.credentialDefinition?.value?.overlay ||
        normalizedRaw?.credentialDefinition?.data?.value?.overlay ||
        normalizedRaw?.overlay ||
        normalizedRaw?.data?.overlay ||
        normalizedRaw?.data?.value?.overlay ||
        credDef?.overlay ||
        (credDef as any)?.data?.overlay ||
        credDef?.value?.overlay ||
        (credDef as any)?.data?.value?.overlay

      if (!overlay) {
        console.info('[KanonOCAResolver] No overlay found in credDef', { credDefId })

        // Fallback: fetch raw credential definition from ledger to extract overlay
        try {
          const ledgerService = this.agent?.dependencyManager.resolve(EthereumLedgerService)
          if (ledgerService) {
            const ledgerResponse: any = await ledgerService.getCredentialDefinition(credDefId)
            const rawJson = Array.isArray(ledgerResponse) ? ledgerResponse[2] : undefined
            const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : undefined
            const ledgerOverlay =
              parsed?.data?.overlay ||
              parsed?.data?.value?.overlay ||
              parsed?.overlay ||
              parsed?.data?.value?.primary?.overlay
            if (ledgerOverlay) {
              console.info('[KanonOCAResolver] Overlay found via ledger fallback', { credDefId })
              return this.convertKanonOverlayToOCABundle(ledgerOverlay, credDefId, language)
            }
          }
        } catch (ledgerError) {
          console.info('[KanonOCAResolver] Ledger overlay fallback failed', { credDefId, ledgerError })
        }

        return undefined
      }

      console.info('[KanonOCAResolver] Overlay Metadata', {
        displayName: overlay?.meta?.name,
        issuer: overlay?.meta?.issuer,
        primaryColor: overlay?.branding?.primary_background_color,
        secondaryColor: overlay?.branding?.secondary_background_color,
        primaryAttribute: overlay?.branding?.primary_attribute,
        secondaryAttribute: overlay?.branding?.secondary_attribute,
        logoUrl: overlay?.branding?.logo,
        backgroundImageUrl: overlay?.branding?.background_image,
      })

      // Convert Kanon overlay format to OCA bundle format
      return this.convertKanonOverlayToOCABundle(overlay, credDefId, language)
    } catch (error) {
      console.info('[KanonOCAResolver] getCredentialDefinition failed', { credDefId, error })
      // Silently fail - credential will use default overlay
      return undefined
    }
  }


  /**
   * Convert Kanon overlay format to OCA bundle format
   * Handles both snake_case (from server) and camelCase formats
   */
  private convertKanonOverlayToOCABundle(
    overlay: KanonOverlay,
    credDefId: string,
    language?: string
  ): OCABundle {
    const lang = language || 'en'
    const branding = overlay.branding as any

    // Build capture base
    const captureBase = {
      type: 'spec/capture_base/1.0',
      digest: credDefId,
      classification: overlay.classification || '',
      attributes: overlay.attributes || {},
      flagged_attributes: overlay.flaggedAttributes || [],
    }

    // Build overlays array
    const overlays: any[] = []

    // Meta overlay - handle both snake_case and camelCase
    if (overlay.meta) {
      const meta = overlay.meta as any
      overlays.push({
        type: 'spec/overlays/meta/1.0',
        capture_base: credDefId,
        language: lang,
        name: meta.name || '',
        description: meta.description || '',
        issuer: meta.issuer || '',
        issuer_description: meta.issuer_description || meta.issuerDescription || '',
        issuer_url: meta.issuer_url || meta.issuerUrl || '',
        credential_help_text: meta.credential_help_text || meta.credentialHelpText || '',
        credential_support_url: meta.credential_support_url || meta.credentialSupportUrl || '',
      })
    }

    // Label overlay
    if (overlay.labels) {
      overlays.push({
        type: 'spec/overlays/label/1.0',
        capture_base: credDefId,
        language: lang,
        attribute_labels: overlay.labels,
      })
    }

    // Branding overlay - handle both snake_case and camelCase from server
    if (branding) {
      overlays.push({
        type: 'aries/overlays/branding/0.1',
        capture_base: credDefId,
        language: lang,
        logo: branding.logo || '',
        background_color: branding.background_color || branding.backgroundColor || '#FFFFFF',
        background_image: branding.background_image || branding.backgroundImage || '',
        background_image_slice: branding.background_image_slice || branding.backgroundImageSlice || '',
        primary_background_color: branding.primary_background_color || branding.primaryBackgroundColor || '',
        secondary_background_color: branding.secondary_background_color || branding.secondaryBackgroundColor || '',
        primary_attribute: branding.primary_attribute || branding.primaryAttribute || '',
        secondary_attribute: branding.secondary_attribute || branding.secondaryAttribute || '',
        svg_template_url: branding.svg_template_url || branding.svgTemplateUrl || '',
        svg_bindings: branding.svg_bindings || branding.svgBindings || {},
        header: branding.header || { color: '#000000' },
        footer: branding.footer || { color: '#000000' },
      })
    }

    return {
      captureBase,
      overlays,
    } as unknown as OCABundle
  }



  /**
   * Override resolveAllBundles to use our custom resolve for Kanon bundles
   */
  public async resolveAllBundles(params: OCABundleResolveAllParams): Promise<CredentialOverlay<BrandingOverlay>> {
    const credDefId = params.identifiers.credentialDefinitionId
    console.info('[KanonOCAResolver] resolveAllBundles', { credDefId })

    // First try the default resolver (local bundles) - use parent's resolveAllBundles
    // which knows how to process local bundles correctly
    const localBundle = await super.resolve({
      identifiers: params.identifiers,
      language: params.language,
    })
    if (localBundle) {
      // Use parent's resolveAllBundles for local bundles
      return super.resolveAllBundles(params) as Promise<CredentialOverlay<BrandingOverlay>>
    }

    // Check cache for Kanon bundles
    if (credDefId && this.cachedOverlays.has(credDefId)) {
      const cachedBundle = this.cachedOverlays.get(credDefId)!
      return this.processBundle(cachedBundle, params)
    }

    // Try to fetch from Kanon credential definition
    if (credDefId && this.agent) {
      try {
        console.info('[KanonOCAResolver] Fetching overlay from ledger', { credDefId })
        const kanonBundle = await this.fetchKanonOCA(credDefId, params.language)
        if (kanonBundle) {
          this.cachedOverlays.set(credDefId, kanonBundle)
          return this.processBundle(kanonBundle, params)
        }
      } catch (error) {
        // Silently fail - credential will use default overlay
      }
    }

    // Fall back to default behavior
    return super.resolveAllBundles(params) as Promise<CredentialOverlay<BrandingOverlay>>
  }

  /**
   * Process a bundle into CredentialOverlay format
   */
  private processBundle(bundle: OCABundle, params: OCABundleResolveAllParams): CredentialOverlay<BrandingOverlay> {
    const lang = params.language || 'en'

    // Extract meta overlay
    const bundleAny = bundle as any
    const metaOverlay = bundleAny.overlays?.find(
      (o: any) => o.type === 'spec/overlays/meta/1.0' && o.language === lang
    ) as any

    // Extract label overlay
    const labelOverlay = bundleAny.overlays?.find(
      (o: any) => o.type === 'spec/overlays/label/1.0' && o.language === lang
    ) as any

    // Extract branding overlay and convert to camelCase for UI components
    const rawBrandingOverlay = bundleAny.overlays?.find(
      (o: any) => o.type === 'aries/overlays/branding/0.1'
    ) as any

    // Convert snake_case to camelCase for branding overlay
    // UI components expect camelCase (e.g., primaryBackgroundColor, not primary_background_color)
    const brandingOverlay = rawBrandingOverlay ? {
      logo: rawBrandingOverlay.logo,
      backgroundColor: rawBrandingOverlay.background_color || rawBrandingOverlay.backgroundColor,
      backgroundImage: rawBrandingOverlay.background_image || rawBrandingOverlay.backgroundImage,
      backgroundImageSlice: rawBrandingOverlay.background_image_slice || rawBrandingOverlay.backgroundImageSlice,
      primaryBackgroundColor: rawBrandingOverlay.primary_background_color || rawBrandingOverlay.primaryBackgroundColor,
      secondaryBackgroundColor: rawBrandingOverlay.secondary_background_color || rawBrandingOverlay.secondaryBackgroundColor,
      primaryAttribute: rawBrandingOverlay.primary_attribute || rawBrandingOverlay.primaryAttribute,
      secondaryAttribute: rawBrandingOverlay.secondary_attribute || rawBrandingOverlay.secondaryAttribute,
      issuedDateAttribute: rawBrandingOverlay.issued_date_attribute || rawBrandingOverlay.issuedDateAttribute,
      expiryDateAttribute: rawBrandingOverlay.expiry_date_attribute || rawBrandingOverlay.expiryDateAttribute,
      svgTemplateUrl: rawBrandingOverlay.svg_template_url || rawBrandingOverlay.svgTemplateUrl,
      svgBindings: rawBrandingOverlay.svg_bindings || rawBrandingOverlay.svgBindings,
      header: rawBrandingOverlay.header,
      footer: rawBrandingOverlay.footer,
    } as unknown as BrandingOverlay : undefined

    // Build presentation fields with labels
    const presentationFields = params.attributes?.map((attr) => {
      const label = labelOverlay?.attribute_labels?.[attr.name || ''] || attr.name
      return {
        ...attr,
        label,
      }
    })

    return {
      bundle,
      presentationFields,
      metaOverlay: metaOverlay ? {
        name: metaOverlay.name,
        description: metaOverlay.description,
        issuer: metaOverlay.issuer,
        issuerDescription: metaOverlay.issuer_description,
        credentialHelpText: metaOverlay.credential_help_text,
        credentialSupportUrl: metaOverlay.credential_support_url,
      } : undefined,
      brandingOverlay,
    } as CredentialOverlay<BrandingOverlay>
  }
}

/**
 * Kanon overlay format as stored in credential definition
 */
interface KanonOverlay {
  classification?: string
  attributes?: Record<string, string>
  flaggedAttributes?: string[]
  meta?: {
    name?: string
    description?: string
    issuer?: string
    issuerDescription?: string
    issuerUrl?: string
    credentialHelpText?: string
    credentialSupportUrl?: string
  }
  labels?: Record<string, string>
  branding?: {
    logo?: string
    backgroundColor?: string
    backgroundImage?: string
    backgroundImageSlice?: string
    primaryBackgroundColor?: string
    secondaryBackgroundColor?: string
    primaryAttribute?: string
    secondaryAttribute?: string
    header?: { color: string }
    footer?: { color: string }
  }
}
