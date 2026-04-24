import 'react-native-get-random-values'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { WebView } from 'react-native-webview'
import Config from 'react-native-config'
import { v4 as uuidv4 } from 'uuid'
import { sha256 } from 'react-native-sha256'
import { Buffer } from 'buffer'
import { useRoute } from '@react-navigation/native'

import { ESSIScreen, ESSIButton } from '../../components/essi'
import { palette, spacing, typography, radius } from '../../theme/essi'
import { testIdWithKey } from '../../utils/testable'

type DigiCallbackResponse = {
  success: boolean
  token?: any
  user?: any
  doc?: {
    selected?: any
    items?: any[]
    xml?: string
    hmac?: string | null
    error?: string
    status?: number
    details?: string
  }
  state?: string
  message?: string
  error?: any
}

const DIGILOCKER_AUTH_URL = 'https://digilocker.meripehchaan.gov.in/public/oauth2/1/authorize'
const DIGILOCKER_REDIRECT_URI =
  Config.DIGILOCKER_REDIRECT_URI || 'https://api.essi.studio/api/digilocker/callback/v2'
const DIGILOCKER_INCLUDE_USERDETAILS =
  Config.DIGILOCKER_INCLUDE_USERDETAILS === 'true'
const DIGILOCKER_INCLUDE_PARTNER_SCOPES =
  Config.DIGILOCKER_INCLUDE_PARTNER_SCOPES === 'true'
const DIGILOCKER_AMR = Config.DIGILOCKER_AMR || ''
const DIGILOCKER_ACR = Config.DIGILOCKER_ACR || ''
const DIGILOCKER_DL_FLOW = Config.DIGILOCKER_DL_FLOW || ''
const DIGILOCKER_PLA = Config.DIGILOCKER_PLA || ''

const DEFAULT_SCOPE = 'openid files.issueddocs'

const MAX_XML_PREVIEW = 4000
const MAX_JSON_PREVIEW = 1500
const XML_FIELD_LIMIT = 120

const base64UrlEncode = (input: Uint8Array) =>
  Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const hexToBytes = (hex: string): Uint8Array => {
  const clean = hex.replace(/^0x/, '')
  const pairs = clean.match(/.{1,2}/g) || []
  return Uint8Array.from(pairs.map((b) => parseInt(b, 16)))
}

const maskValue = (value?: string | null, keep = 4) => {
  if (!value) return 'missing'
  if (value.length <= keep * 2) return `${value.slice(0, keep)}...`
  return `${value.slice(0, keep)}...${value.slice(-keep)}`
}

const createPkce = async () => {
  const random = new Uint8Array(64)
  if (!global.crypto?.getRandomValues) {
    throw new Error('crypto.getRandomValues not available')
  }
  global.crypto.getRandomValues(random)
  const verifier = base64UrlEncode(random)
  const challengeHex = await sha256(verifier)
  const challenge = base64UrlEncode(hexToBytes(challengeHex))
  return { codeVerifier: verifier, codeChallenge: challenge }
}

const buildScope = (
  requestedScope?: string,
  options?: { requireIssued?: boolean; reqDoctype?: string }
) => {
  const rawTokens = (requestedScope || DEFAULT_SCOPE)
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const initialTokens = rawTokens

  const tokens: string[] = []
  const seen = new Set<string>()
  const addToken = (token: string) => {
    const key = token.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    tokens.push(token)
  }

  initialTokens.forEach(addToken)

  if (!seen.has('openid')) {
    addToken('openid')
  }
  if ((options?.requireIssued || true) && !seen.has('files.issueddocs')) {
    addToken('files.issueddocs')
  }

  if (DIGILOCKER_INCLUDE_USERDETAILS && !seen.has('userdetails')) {
    addToken('userdetails')
  }
  if (DIGILOCKER_INCLUDE_PARTNER_SCOPES && options?.reqDoctype) {
    const doctypes = options.reqDoctype
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean)
    if (doctypes.includes('PANCR')) addToken('partners.PANCR')
    if (doctypes.includes('DRVLC')) addToken('partners.DRVLC')
  }

  return tokens.join(' ')
}

const truncate = (value: string, max: number) => (value.length > max ? `${value.slice(0, max)}...` : value)

const formatValue = (value: unknown, max = MAX_JSON_PREVIEW): string | null => {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    const json = JSON.stringify(value)
    return json.length > max ? `${json.slice(0, max)}...` : json
  } catch (e) {
    return String(value)
  }
}

const toDisplayEntries = (entries: Array<[string, unknown]>, max = MAX_JSON_PREVIEW) =>
  entries.reduce<Array<[string, string]>>((acc, [label, value]) => {
    const formatted = formatValue(value, max)
    if (formatted === null || formatted === '') return acc
    acc.push([label, formatted])
    return acc
  }, [])

const extractXmlAttributes = (xml: string, limit: number): Array<[string, string]> => {
  const out: Array<[string, string]> = []
  const tagRe = /<([A-Za-z0-9_:-]+)\s+([^>]+?)\/?>/g
  let tagMatch
  while ((tagMatch = tagRe.exec(xml)) !== null && out.length < limit) {
    const tag = tagMatch[1]
    const attrsChunk = tagMatch[2]
    const attrRe = /([A-Za-z0-9_:-]+)\s*=\s*"([^"]*)"/g
    let attrMatch
    while ((attrMatch = attrRe.exec(attrsChunk)) !== null && out.length < limit) {
      const value = attrMatch[2]
      if (!value) continue
      out.push([`${tag}.${attrMatch[1]}`, value])
    }
  }
  return out
}

const extractXmlTextNodes = (xml: string, limit: number): Array<[string, string]> => {
  const out: Array<[string, string]> = []
  const textRe = /<([A-Za-z0-9_:-]+)>([^<>]{1,200})<\/\1>/g
  let match
  while ((match = textRe.exec(xml)) !== null && out.length < limit) {
    const value = match[2].trim()
    if (!value) continue
    out.push([match[1], value])
  }
  return out
}

const getParam = (url: string, key: string) => {
  const match = url.match(new RegExp(`[?&]${key}=([^&#]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

const getXmlSummary = (xml?: string, limit = XML_FIELD_LIMIT): Array<[string, string]> => {
  if (!xml) return []
  const combined = [...extractXmlAttributes(xml, limit), ...extractXmlTextNodes(xml, limit)]
  const seen = new Set<string>()
  const out: Array<[string, string]> = []
  for (const [key, value] of combined) {
    if (seen.has(key)) continue
    seen.add(key)
    out.push([key, value])
    if (out.length >= limit) break
  }
  return out
}

const renderKeyValueRows = (entries: Array<[string, string]>) =>
  entries.map(([label, value], index) => (
    <View style={styles.row} key={`${label}-${index}`}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  ))

const getConsentErrorMessage = (url: string) => {
  const error = getParam(url, 'error') || ''
  const description = getParam(url, 'error_description') || ''
  if (error.toLowerCase() === 'access_denied' || description.toLowerCase().includes('denied')) {
    return 'Please grant DigiLocker permission to create verifiable credentials.'
  }
  if (description) return description
  if (error) return `DigiLocker error: ${error}`
  return null
}

const ESSIDigilockerImport: React.FC = () => {
  const route = useRoute<any>()
  const params = route.params || {}
  const {
    title = 'Import via DigiLocker',
    description = 'Continue to DigiLocker, approve access, and we’ll fetch your document securely.',
    reqDoctype,
    scopes,
    acr,
    viewIssued,
  } = params

  const webviewRef = useRef<WebView>(null)
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const [codeVerifier, setCodeVerifier] = useState<string | null>(null)
  const [stateParam, setStateParam] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DigiCallbackResponse | null>(null)
  const [showDocXml, setShowDocXml] = useState(false)

  const backendUrl = Config.ESSI_BACKEND_URL
  const clientId = Config.DIGILOCKER_CLIENT_ID

  const buildAuthorizeUrl = useCallback(
    (challenge: string, state: string) => {
      const scope = buildScope(scopes, {
        requireIssued: Boolean(viewIssued || reqDoctype),
        reqDoctype,
      })
      const normalizedReqDoctype = reqDoctype?.trim() || undefined
      const acrTokens: string[] = []
      const pushToken = (value?: string) => {
        if (!value) return
        value
          .split(/[\s+]+/)
          .map((v) => v.trim())
          .filter(Boolean)
          .forEach((v) => acrTokens.push(v))
      }
      pushToken(acr)
      pushToken(DIGILOCKER_ACR)
      const acrParam = acrTokens.length ? Array.from(new Set(acrTokens)).join(' ') : undefined
      if (!scope.split(' ').includes('openid')) {
        console.warn('[DigiLocker][authorize] Missing openid in scope; forcing openid:', scope)
      }
      if (scopes && scopes.trim() && scopes.trim() !== scope) {
        console.log('[DigiLocker][authorize] Normalized scope', { requested: scopes, resolved: scope })
      }
      const params = {
        response_type: 'code',
        client_id: clientId || '',
        redirect_uri: DIGILOCKER_REDIRECT_URI,
        scope,
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        acr: acrParam,
        req_doctype: normalizedReqDoctype,
        amr: DIGILOCKER_AMR || undefined,
        dl_flow: DIGILOCKER_DL_FLOW || undefined,
        pla: DIGILOCKER_PLA || undefined,
      }
      const query = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
      console.log('[DigiLocker][authorize] params', params)
      return `${DIGILOCKER_AUTH_URL}?${query}`
    },
    [clientId, scopes, acr, reqDoctype, viewIssued]
  )

  const initAuth = useCallback(async (options?: { preserveError?: boolean }) => {
    try {
      if (!options?.preserveError) {
        setError(null)
      }
      setResult(null)
      if (!clientId) {
        throw new Error('DIGILOCKER_CLIENT_ID is missing in env')
      }
      if (!backendUrl) {
        throw new Error('ESSI_BACKEND_URL is missing in env')
      }

      console.log('[DigiLocker][init] config', {
        backendUrl,
        clientId: maskValue(clientId),
        redirectUri: DIGILOCKER_REDIRECT_URI,
        authorizeUrl: DIGILOCKER_AUTH_URL,
        reqDoctype,
        scopes,
        acr,
        viewIssued,
        includeUserDetails: DIGILOCKER_INCLUDE_USERDETAILS,
        includePartnerScopes: DIGILOCKER_INCLUDE_PARTNER_SCOPES,
        amr: DIGILOCKER_AMR,
        dl_flow: DIGILOCKER_DL_FLOW,
        pla: DIGILOCKER_PLA,
        extraAcr: DIGILOCKER_ACR,
      })

      const state = uuidv4()
      const pkce = await createPkce()
      console.log('[DigiLocker][init] PKCE created', {
        verifierLength: pkce.codeVerifier.length,
        challengeLength: pkce.codeChallenge.length,
        stateLength: state.length,
      })
      setCodeVerifier(pkce.codeVerifier)
      setStateParam(state)
      const nextAuthUrl = buildAuthorizeUrl(pkce.codeChallenge, state)
      setAuthUrl(nextAuthUrl)
      console.log('[DigiLocker][init] authorize URL', nextAuthUrl)
    } catch (e: any) {
      setError(e?.message || 'Failed to start DigiLocker login')
    }
  }, [backendUrl, buildAuthorizeUrl, clientId, reqDoctype, scopes, acr, viewIssued])

  useEffect(() => {
    initAuth()
  }, [initAuth])

  const handleExchange = useCallback(
    async (code: string, returnedState?: string | null) => {
      if (!backendUrl || !codeVerifier) {
        setError('Missing setup for DigiLocker exchange')
        console.error('[DigiLocker][exchange] Missing backendUrl/codeVerifier')
        return
      }
      setLoading(true)
      setError(null)
      try {
        const resolvedState = returnedState ?? stateParam ?? ''
        const params = [
          ['code', code],
          ['code_verifier', codeVerifier],
          ['state', resolvedState],
        ]
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        if (reqDoctype) {
          params.push(`req_doctype=${encodeURIComponent(reqDoctype)}`)
        }
        const url = `${backendUrl}/api/digilocker/callback/v2?${params.join('&')}`
        console.log('[DigiLocker][exchange] GETting code to backend', {
          url,
          state: resolvedState,
          req_doctype: reqDoctype,
        })
        const res = await fetch(url, {
          method: 'GET',
        })
        const contentType = res.headers.get('content-type') || ''
        let json: DigiCallbackResponse | null = null
        let textBody: string | null = null
        try {
          if (contentType.includes('application/json')) {
            json = (await res.json()) as DigiCallbackResponse
          } else {
            textBody = await res.text()
          }
        } catch (e) {
          // ignore parsing errors and fallback
        }

        const success = json?.success && res.ok
        if (!success) {
          const msg =
            json?.message ||
            (json as any)?.error_description ||
            (json as any)?.error ||
            (textBody ? `Unexpected response: ${textBody.slice(0, 200)}` : 'Failed to fetch Aadhaar details')
          setError(msg)
          console.error('[DigiLocker][exchange] Error response', { status: res.status, body: json || textBody })
          Alert.alert('DigiLocker Error', msg)
          return
        }

        console.log('[DigiLocker][exchange] Success; keys:', Object.keys(json || {}))
        setResult(json as DigiCallbackResponse)
      } catch (e: any) {
        const msg = e?.message || 'Network error during DigiLocker exchange'
        setError(msg)
        console.error('[DigiLocker][exchange] Exception', e)
        Alert.alert('DigiLocker Error', msg)
      } finally {
        setLoading(false)
      }
    },
    [backendUrl, codeVerifier, stateParam, reqDoctype]
  )

  const shouldStartLoad = useCallback(
    (navState: any) => {
      const url: string = navState.url
      console.log('[DigiLocker][webview] shouldStartLoad', {
        url,
        isTopFrame: navState.isTopFrame,
        navigationType: navState.navigationType,
      })
      if (!url || !url.startsWith(DIGILOCKER_REDIRECT_URI)) {
        return true
      }
      try {
        const code = getParam(url, 'code')
        const returnedState = getParam(url, 'state')
        if (!code) {
          const consentError = getConsentErrorMessage(url)
          const msg = consentError || 'Authorization code not found in redirect'
          setError(msg)
          if (consentError) {
            void initAuth({ preserveError: true })
          }
          console.error('[DigiLocker][redirect] Missing code in URL', { url, consentError })
          return false
        }
        console.log('[DigiLocker][redirect] Captured code/state', { code, returnedState })
        handleExchange(code, returnedState)
      } catch (e: any) {
        setError(e?.message || 'Failed to parse redirect URL')
        console.error('[DigiLocker][redirect] Parse error', e)
      }
      return false
    },
    [handleExchange, initAuth]
  )

  const renderResult = useMemo(() => {
    if (!result) return null

    const doc = result.doc
    const docXmlSummary = doc?.xml ? getXmlSummary(doc.xml, XML_FIELD_LIMIT) : []
    const docXmlPreview = doc?.xml ? (showDocXml ? doc.xml : truncate(doc.xml, MAX_XML_PREVIEW)) : null
    const docEntries = toDisplayEntries([
      ['Requested Doctype', reqDoctype],
      ['Doctype', doc?.selected?.doctype || doc?.selected?.type || doc?.selected?.name],
      ['Description', doc?.selected?.description || doc?.selected?.name],
      ['Issuer', doc?.selected?.issuer || doc?.selected?.issuerid],
      ['URI', doc?.selected?.uri],
      ['Status', doc?.status],
      ['Details', doc?.details],
      ['Items', doc?.items?.length],
    ])
    const selectedExtras = toDisplayEntries(
      Object.entries(doc?.selected || {}).filter(
        ([key]) => !['doctype', 'description', 'name', 'issuer', 'issuerid', 'uri'].includes(key)
      )
    )
    const itemsPreview = doc?.items?.length ? formatValue(doc.items.slice(0, 3), MAX_JSON_PREVIEW) : null

    const responseEntries = toDisplayEntries([
      ['State', result.state],
      ['Message', result.message],
      ['Error', result.error],
      ['User', result.user],
      ['Token', result.token],
    ])
    const responseCard = responseEntries.length ? (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Other Response Data</Text>
        {renderKeyValueRows(responseEntries)}
      </View>
    ) : null

    return (
      <>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Document Details</Text>
          {doc?.selected ? (
            <>
              {docEntries.length ? renderKeyValueRows(docEntries) : null}
              {selectedExtras.length ? (
                <>
                  <Text style={styles.blockLabel}>Additional fields</Text>
                  {renderKeyValueRows(selectedExtras)}
                </>
              ) : null}
              {itemsPreview ? (
                <>
                  <Text style={styles.blockLabel}>Items preview</Text>
                  <Text style={styles.blockText} selectable>
                    {itemsPreview}
                  </Text>
                </>
              ) : null}
              {doc.hmac ? <Text style={styles.hint}>HMAC: {doc.hmac.slice(0, 48)}...</Text> : null}
              {doc.xml ? <Text style={styles.hint}>XML length: {doc.xml.length}</Text> : null}
            </>
          ) : (
            <Text style={styles.rowValue}>{doc?.error || 'No matching document found for this doctype.'}</Text>
          )}
          {doc?.error ? <Text style={styles.errorText}>{doc.error}</Text> : null}
        </View>

        {doc?.xml ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>XML Details</Text>
            {docXmlSummary.length ? renderKeyValueRows(docXmlSummary) : (
              <Text style={styles.rowValue}>No XML summary available.</Text>
            )}
            {docXmlPreview ? (
              <>
                <Text style={styles.blockLabel}>Raw XML</Text>
                <Text style={styles.blockText} selectable>
                  {docXmlPreview}
                </Text>
              </>
            ) : null}
            {doc.xml.length > MAX_XML_PREVIEW ? (
              <ESSIButton
                variant="ghost"
                onPress={() => setShowDocXml((prev) => !prev)}
                style={styles.inlineButton}
              >
                {showDocXml ? 'Show less XML' : 'Show full XML'}
              </ESSIButton>
            ) : null}
          </View>
        ) : null}

        {responseCard}
      </>
    )
  }, [result, reqDoctype, showDocXml])

  return (
    <ESSIScreen headerTitle={title} scrollable={false}>
      <View style={styles.fullContainer}>
        {error ? <Text style={[styles.errorText, styles.mbSm]}>{error}</Text> : null}

        {!authUrl || !codeVerifier || !stateParam ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.primary} />
            <Text style={styles.hint}>Preparing DigiLocker flow…</Text>
          </View>
        ) : result ? (
          <ScrollView contentContainerStyle={styles.container}>{renderResult}</ScrollView>
        ) : (
          <>
            <View style={styles.webviewFull}>
              {/* <View style={styles.overlayHeader}>
                <Text style={styles.stripTitle}>Continue with DigiLocker</Text>
                <Text style={styles.stripText}>
                  Sign in and approve access; we’ll fetch your Aadhaar details securely.
                </Text>
                <ESSIButton
                  variant="primary"
                  onPress={() => {
                    setResult(null)
                    webviewRef.current?.reload()
                  }}
                  loading={loading}
                  fullWidth
                  testID={testIdWithKey('DigiLockerStart')}
                >
                  Reload DigiLocker
                </ESSIButton>
              </View> */}
              <WebView
                ref={webviewRef}
                source={{ uri: authUrl }}
                onShouldStartLoadWithRequest={shouldStartLoad}
                onLoadStart={(event) => {
                  console.log('[DigiLocker][webview] load start', { url: event.nativeEvent.url })
                }}
                onLoadProgress={(event) => {
                  console.log('[DigiLocker][webview] load progress', {
                    url: event.nativeEvent.url,
                    progress: event.nativeEvent.progress,
                  })
                }}
                onNavigationStateChange={(navState) => {
                  console.log('[DigiLocker][webview] navigation state', {
                    url: navState.url,
                    title: navState.title,
                    loading: navState.loading,
                    canGoBack: navState.canGoBack,
                    canGoForward: navState.canGoForward,
                  })
                }}
                onHttpError={(event) => {
                  console.error('[DigiLocker][webview] http error', {
                    url: event.nativeEvent.url,
                    statusCode: event.nativeEvent.statusCode,
                  })
                  setError(`WebView HTTP error ${event.nativeEvent.statusCode}`)
                }}
                onError={(event) => {
                  console.error('[DigiLocker][webview] error', {
                    url: event.nativeEvent.url,
                    code: event.nativeEvent.code,
                    description: event.nativeEvent.description,
                  })
                  setError(
                    `WebView error ${event.nativeEvent.code}: ${event.nativeEvent.description || 'Unknown error'}`
                  )
                }}
                onLoadEnd={(event) => {
                  console.log('[DigiLocker][webview] load end', {
                    url: event.nativeEvent.url,
                    loading: event.nativeEvent.loading,
                  })
                }}
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.webviewLoading}>
                    <ActivityIndicator color={palette.primary} />
                  </View>
                )}
              />
            </View>
          </>
        )}
      </View>
    </ESSIScreen>
  )
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: palette.background,
  },
  container: {
    gap: spacing.lg,
    padding: spacing.gutter,
  },
  headerStrip: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.md,
    backgroundColor: palette.background,
    gap: spacing.sm,
  },
  stripTitle: {
    ...typography.bodyBold,
    color: palette.text,
  },
  stripText: {
    ...typography.caption,
    color: palette.muted,
  },
  overlayHeader: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.md,
    backgroundColor: palette.background,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderColor: palette.outline,
  },
  errorText: {
    color: palette.danger,
    ...typography.caption,
  },
  mbSm: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.gutter,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  hint: {
    ...typography.caption,
    color: palette.muted,
    marginTop: spacing.xs,
  },
  webviewFull: {
    flex: 1,
    borderTopWidth: 1,
    borderColor: palette.outline,
    overflow: 'hidden',
  },
  webviewLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceSecondary,
    borderWidth: 1,
    borderColor: palette.outline,
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.bodyBold,
    color: palette.text,
  },
  blockLabel: {
    ...typography.caption,
    color: palette.muted,
  },
  blockText: {
    ...typography.caption,
    color: palette.text,
    marginTop: spacing.xs,
  },
  inlineButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: 0,
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowLabel: {
    ...typography.caption,
    color: palette.muted,
  },
  rowValue: {
    ...typography.caption,
    color: palette.text,
    flexShrink: 1,
    textAlign: 'right',
  },
})

export default ESSIDigilockerImport
