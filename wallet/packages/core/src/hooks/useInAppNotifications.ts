import { useEffect, useRef } from 'react'
import { useAgent } from '@credo-ts/react-hooks'
import { useNavigation } from '@react-navigation/native'
import { CredentialEventTypes, CredentialState, ProofEventTypes, ProofState } from '@credo-ts/core'
import Toast from 'react-native-toast-message'
import { useTranslation } from 'react-i18next'

import { Screens, Stacks } from '../types/navigators'
import { useWorkflowEvents } from './useWorkflowEvents'

/**
 * Hook to show in-app toast notifications when credentials/proofs/workflows are received
 * Shows a tappable notification that navigates to the appropriate screen
 */
export function useInAppNotifications() {
  const { agent } = useAgent()
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const lastNotifiedRef = useRef<Set<string>>(new Set())

  // Listen for credential offer events
  useEffect(() => {
    if (!agent) return

    const handleCredentialStateChange = (event: any) => {
      const { credentialRecord } = event.payload
      const recordId = credentialRecord?.id

      // Only show notification for new offers
      if (
        credentialRecord?.state === CredentialState.OfferReceived &&
        recordId &&
        !lastNotifiedRef.current.has(`cred-${recordId}`)
      ) {
        lastNotifiedRef.current.add(`cred-${recordId}`)

        Toast.show({
          type: 'info',
          text1: t('CredentialOffer.NewCredentialOffer') || 'New Credential Offer',
          text2: t('CredentialOffer.TapToView') || 'Tap to view and accept',
          visibilityTime: 5000,
          autoHide: true,
          topOffset: 50,
          onPress: () => {
            Toast.hide()
            // Navigate to Connection screen which handles credential offers
            navigation.navigate(Stacks.ConnectionStack, {
              screen: Screens.Connection,
              params: { credentialId: recordId },
            })
          },
        })
      }
    }

    agent.events.on(CredentialEventTypes.CredentialStateChanged, handleCredentialStateChange)

    return () => {
      agent.events.off(CredentialEventTypes.CredentialStateChanged, handleCredentialStateChange)
    }
  }, [agent, navigation, t])

  // Listen for proof request events
  useEffect(() => {
    if (!agent) return

    const handleProofStateChange = (event: any) => {
      const { proofRecord } = event.payload
      const recordId = proofRecord?.id

      // Only show notification for new proof requests
      if (
        proofRecord?.state === ProofState.RequestReceived &&
        recordId &&
        !lastNotifiedRef.current.has(`proof-${recordId}`)
      ) {
        lastNotifiedRef.current.add(`proof-${recordId}`)

        Toast.show({
          type: 'info',
          text1: t('ProofRequest.NewProofRequest') || 'New Proof Request',
          text2: t('ProofRequest.TapToView') || 'Tap to view and respond',
          visibilityTime: 5000,
          autoHide: true,
          topOffset: 50,
          onPress: () => {
            Toast.hide()
            // Navigate to Connection screen which handles proof requests
            navigation.navigate(Stacks.ConnectionStack, {
              screen: Screens.Connection,
              params: { proofId: recordId },
            })
          },
        })
      }
    }

    agent.events.on(ProofEventTypes.ProofStateChanged, handleProofStateChange)

    return () => {
      agent.events.off(ProofEventTypes.ProofStateChanged, handleProofStateChange)
    }
  }, [agent, navigation, t])

  // Listen for workflow events (new workflows need attention)
  useWorkflowEvents({
    onCreated: (event) => {
      const instanceId = event.payload?.instanceRecord?.instanceId
      const templateId = event.payload?.instanceRecord?.templateId

      if (instanceId && !lastNotifiedRef.current.has(`workflow-${instanceId}`)) {
        lastNotifiedRef.current.add(`workflow-${instanceId}`)

        const templateName = templateId
          ?.replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Workflow'

        Toast.show({
          type: 'info',
          text1: t('Workflow.NewWorkflowRequest') || 'New Workflow Request',
          text2: templateName,
          visibilityTime: 5000,
          autoHide: true,
          topOffset: 50,
          onPress: () => {
            Toast.hide()
            // Navigate to workflow details screen
            navigation.navigate(Screens.WorkflowDetails, { instanceId })
          },
        })
      }
    },
  })

  // Clear old entries periodically to prevent memory buildup
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastNotifiedRef.current.size > 100) {
        lastNotifiedRef.current.clear()
      }
    }, 60000) // Clear every minute if too many entries

    return () => clearInterval(interval)
  }, [])
}
