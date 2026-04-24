import { useState, useEffect, useCallback, useRef } from 'react'
import { useAgent } from '@credo-ts/react-hooks'

/**
 * Known protocol URIs for capability checking
 */
export const ProtocolURIs = {
  WebRTC: 'https://didcomm.org/webrtc/1.0',
  Workflow: 'https://didcomm.org/workflow/1.0',
  BasicMessage: 'https://didcomm.org/basicmessage/2.0',
  Credentials: 'https://didcomm.org/issue-credential/2.0',
  Proofs: 'https://didcomm.org/present-proof/2.0',
} as const

export type ProtocolURI = typeof ProtocolURIs[keyof typeof ProtocolURIs] | string

/**
 * Capability status for a connection
 */
export interface ConnectionCapabilities {
  /** Whether WebRTC video/audio calls are supported */
  supportsWebRTC: boolean
  /** Whether workflow protocol is supported */
  supportsWorkflow: boolean
  /** Whether basic messaging is supported */
  supportsBasicMessage: boolean
  /** All discovered protocol URIs */
  protocols: string[]
  /** Whether discovery has been performed */
  isLoaded: boolean
  /** Whether discovery is in progress */
  isLoading: boolean
  /** Error if discovery failed */
  error: Error | null
}

/**
 * Cache for connection capabilities to avoid repeated queries
 */
const capabilityCache = new Map<string, {
  capabilities: ConnectionCapabilities
  timestamp: number
}>()

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Hook to discover and check capabilities of a connection.
 * Uses DIDComm Discover Features protocol (RFC 0557) to query supported protocols.
 *
 * @param connectionId - The connection ID to check capabilities for
 * @param options - Configuration options
 * @returns Connection capabilities and refresh function
 *
 * @example
 * ```tsx
 * const { capabilities, refresh } = useConnectionCapabilities(connectionId)
 *
 * // Only show call button if WebRTC is supported
 * {capabilities.supportsWebRTC && (
 *   <TouchableOpacity onPress={startCall}>
 *     <Icon name="video" />
 *   </TouchableOpacity>
 * )}
 * ```
 */
export function useConnectionCapabilities(
  connectionId: string | undefined,
  options: {
    /** Whether to auto-fetch on mount (default: true) */
    autoFetch?: boolean
    /** Timeout for discovery query in ms (default: 5000) */
    timeoutMs?: number
    /** Whether to use cached results (default: true) */
    useCache?: boolean
  } = {}
): {
  capabilities: ConnectionCapabilities
  refresh: () => Promise<void>
  checkProtocol: (protocolUri: string) => boolean
} {
  const { autoFetch = true, timeoutMs = 5000, useCache = true } = options
  const { agent } = useAgent()
  const fetchedRef = useRef(false)

  const [capabilities, setCapabilities] = useState<ConnectionCapabilities>({
    supportsWebRTC: false,
    supportsWorkflow: false,
    supportsBasicMessage: false,
    protocols: [],
    isLoaded: false,
    isLoading: false,
    error: null,
  })

  /**
   * Query the connection for supported protocols
   */
  const discoverCapabilities = useCallback(async (skipCache = false) => {
    if (!agent || !connectionId) {
      return
    }

    // Check cache first
    if (useCache && !skipCache) {
      const cached = capabilityCache.get(connectionId)
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        console.log('[useConnectionCapabilities] Using cached capabilities for', connectionId)
        setCapabilities(cached.capabilities)
        return
      }
    }

    setCapabilities((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      console.log('[useConnectionCapabilities] Querying capabilities for connection:', connectionId)

      const connection = await agent.connections.getById(connectionId)
      if (!connection.isReady) {
        console.warn(
          `[useConnectionCapabilities] Connection not ready (state=${connection.state}). Skipping capability query for ${connectionId}`
        )
        setCapabilities((prev) => ({ ...prev, isLoading: false }))
        return
      }

      // Use V2 Discover Features protocol to query all protocols
      const result = await agent.discovery.queryFeatures({
        connectionId,
        protocolVersion: 'v2',
        queries: [
          { featureType: 'protocol', match: '*' }, // Query all protocols
        ],
        awaitDisclosures: true,
        awaitDisclosuresTimeoutMs: timeoutMs,
      })

      const features = result.features || []
      const protocols = features
        .filter((f: any) => f.type === 'protocol')
        .map((f: any) => f.id)

      console.log('[useConnectionCapabilities] Discovered protocols:', protocols)

      const newCapabilities: ConnectionCapabilities = {
        supportsWebRTC: protocols.some((p: string) => p.startsWith('https://didcomm.org/webrtc/')),
        supportsWorkflow: protocols.some((p: string) => p.startsWith('https://didcomm.org/workflow/')),
        supportsBasicMessage: protocols.some((p: string) => p.includes('basicmessage')),
        protocols,
        isLoaded: true,
        isLoading: false,
        error: null,
      }

      setCapabilities(newCapabilities)

      // Update cache
      capabilityCache.set(connectionId, {
        capabilities: newCapabilities,
        timestamp: Date.now(),
      })
    } catch (err) {
      console.error('[useConnectionCapabilities] Error discovering capabilities:', err)

      // On error, assume basic capabilities (fallback for older agents)
      const fallbackCapabilities: ConnectionCapabilities = {
        supportsWebRTC: false, // Conservative default
        supportsWorkflow: false,
        supportsBasicMessage: true, // Most agents support this
        protocols: [],
        isLoaded: true,
        isLoading: false,
        error: err as Error,
      }

      setCapabilities(fallbackCapabilities)
    }
  }, [agent, connectionId, timeoutMs, useCache])

  /**
   * Refresh capabilities (bypasses cache)
   */
  const refresh = useCallback(async () => {
    await discoverCapabilities(true)
  }, [discoverCapabilities])

  /**
   * Check if a specific protocol is supported
   */
  const checkProtocol = useCallback((protocolUri: string): boolean => {
    return capabilities.protocols.some((p) =>
      p === protocolUri || p.startsWith(protocolUri.replace(/\/\d+\.\d+$/, '/'))
    )
  }, [capabilities.protocols])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && connectionId && !fetchedRef.current) {
      fetchedRef.current = true
      discoverCapabilities()
    }
  }, [autoFetch, connectionId, discoverCapabilities])

  // Reset when connection changes
  useEffect(() => {
    fetchedRef.current = false
    setCapabilities({
      supportsWebRTC: false,
      supportsWorkflow: false,
      supportsBasicMessage: false,
      protocols: [],
      isLoaded: false,
      isLoading: false,
      error: null,
    })
  }, [connectionId])

  return {
    capabilities,
    refresh,
    checkProtocol,
  }
}

/**
 * Utility function to check WebRTC support for a connection (non-hook version)
 * Useful for one-time checks or in non-React contexts
 */
export async function checkWebRTCSupport(
  agent: any,
  connectionId: string,
  timeoutMs = 5000
): Promise<boolean> {
  // Check cache first
  const cached = capabilityCache.get(connectionId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.capabilities.supportsWebRTC
  }

  try {
    const result = await agent.discovery.queryFeatures({
      connectionId,
      protocolVersion: 'v2',
      queries: [
        { featureType: 'protocol', match: 'https://didcomm.org/webrtc/*' },
      ],
      awaitDisclosures: true,
      awaitDisclosuresTimeoutMs: timeoutMs,
    })

    const hasWebRTC = (result.features || []).some((f: any) =>
      f.type === 'protocol' && f.id.startsWith('https://didcomm.org/webrtc/')
    )

    return hasWebRTC
  } catch (err) {
    console.error('[checkWebRTCSupport] Error:', err)
    return false
  }
}

/**
 * Clear the capability cache for a specific connection or all connections
 */
export function clearCapabilityCache(connectionId?: string) {
  if (connectionId) {
    capabilityCache.delete(connectionId)
  } else {
    capabilityCache.clear()
  }
}
