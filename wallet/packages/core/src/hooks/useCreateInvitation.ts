import { OutOfBandInvitation } from '@credo-ts/core'
import { useAgent } from '@credo-ts/react-hooks'
import { useCallback, useState } from 'react'

import { useStore } from '../contexts/store'
import { TOKENS, useServices } from '../container-api'

export interface CreateInvitationResult {
  invitationUrl: string
  invitation: OutOfBandInvitation
}

export interface UseCreateInvitationReturn {
  createInvitation: (label?: string) => Promise<CreateInvitationResult | null>
  invitationUrl: string | null
  invitation: OutOfBandInvitation | null
  loading: boolean
  error: string | null
  reset: () => void
}

/**
 * Hook to create out-of-band invitations from the mobile wallet.
 * The invitation will use the mediator's endpoint for routing,
 * allowing others to connect to this mobile wallet.
 */
export const useCreateInvitation = (): UseCreateInvitationReturn => {
  const { agent } = useAgent()
  const [store] = useStore()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const [invitationUrl, setInvitationUrl] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<OutOfBandInvitation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setInvitationUrl(null)
    setInvitation(null)
    setError(null)
  }, [])

  const createInvitation = useCallback(
    async (label?: string): Promise<CreateInvitationResult | null> => {
      if (!agent) {
        setError('Agent not initialized')
        return null
      }

      setLoading(true)
      setError(null)

      try {
        // Get the default mediator to use its endpoint
        const mediator = await agent.mediationRecipient.findDefaultMediator()

        if (!mediator) {
          logger.warn('No default mediator found, invitation may not be routable')
        }

        // Create the out-of-band invitation
        // The agent's mediation module will automatically include routing keys
        const { outOfBandInvitation } = await agent.oob.createInvitation({
          label: label || store.preferences.walletName || 'ESSI Wallet',
          multiUseInvitation: false, // Single use for mobile wallet connections
          autoAcceptConnection: true,
        })

        // Use the mediator's endpoint as the domain for the invitation URL
        // This ensures the invitation points to the mediator which can route messages to this wallet
        const mediatorEndpoint = mediator?.endpoint || store.preferences.selectedMediator

        // Parse the mediator URL to get just the domain
        let domain = 'https://mediator.example.com'
        if (mediatorEndpoint) {
          try {
            // If it's an invitation URL, extract the base URL
            const url = new URL(mediatorEndpoint.split('?')[0])
            domain = url.origin
          } catch {
            // If parsing fails, use a default or the raw endpoint
            domain = mediatorEndpoint.split('?')[0]
          }
        }

        const url = outOfBandInvitation.toUrl({ domain })

        logger.info(`Created invitation with URL: ${url.substring(0, 100)}...`)

        setInvitationUrl(url)
        setInvitation(outOfBandInvitation)

        return {
          invitationUrl: url,
          invitation: outOfBandInvitation,
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create invitation'
        logger.error(`Failed to create invitation: ${errorMessage}`)
        setError(errorMessage)
        return null
      } finally {
        setLoading(false)
      }
    },
    [agent, store.preferences.walletName, store.preferences.selectedMediator, logger]
  )

  return {
    createInvitation,
    invitationUrl,
    invitation,
    loading,
    error,
    reset,
  }
}

export default useCreateInvitation
