import { useEffect, useRef } from 'react'
import { useAgent } from '@credo-ts/react-hooks'
import { WebRTCEvents } from '@ajna-inc/webrtc'
import type {
  IncomingOfferEvent,
  IncomingAnswerEvent,
  IncomingIceEvent,
  CallEndedEvent,
  IncomingProposeEvent,
  RenegotiateRequestedEvent,
} from '@ajna-inc/webrtc'

interface UseWebRTCEventsOptions {
  onIncomingPropose?: (event: IncomingProposeEvent) => void
  onIncomingOffer?: (event: IncomingOfferEvent) => void
  onIncomingAnswer?: (event: IncomingAnswerEvent) => void
  onIncomingIce?: (event: IncomingIceEvent) => void
  onRenegotiateRequested?: (event: RenegotiateRequestedEvent) => void
  onCallEnded?: (event: CallEndedEvent) => void
  /** Optional thread ID filter - only receive events for this thread */
  threadId?: string
}

/**
 * Hook to subscribe to WebRTC signaling events from the agent.
 *
 * @example
 * ```tsx
 * useWebRTCEvents({
 *   onIncomingOffer: (event) => {
 *     // Show incoming call UI
 *     navigation.navigate('IncomingCall', {
 *       connectionId: event.context.connection?.id,
 *       threadId: event.thid,
 *       sdp: event.sdp,
 *     })
 *   },
 *   onCallEnded: (event) => {
 *     // Handle call ended
 *   },
 * })
 * ```
 */
export function useWebRTCEvents(options: UseWebRTCEventsOptions) {
  const { agent } = useAgent()
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    if (!agent) return

    const subscriptions: Array<any> = []

    // Incoming propose (call request before offer)
    if (optionsRef.current.onIncomingPropose) {
      const sub = agent.events.on(WebRTCEvents.IncomingPropose, ((event: IncomingProposeEvent) => {
        if (optionsRef.current.threadId && event.thid !== optionsRef.current.threadId) return
        optionsRef.current.onIncomingPropose?.(event)
      }) as any)
      subscriptions.push(sub)
    }

    // Incoming offer (SDP offer)
    if (optionsRef.current.onIncomingOffer) {
      const sub = agent.events.on(WebRTCEvents.IncomingOffer, ((event: IncomingOfferEvent) => {
        if (optionsRef.current.threadId && event.thid !== optionsRef.current.threadId) return
        optionsRef.current.onIncomingOffer?.(event)
      }) as any)
      subscriptions.push(sub)
    }

    // Incoming answer (SDP answer)
    if (optionsRef.current.onIncomingAnswer) {
      const sub = agent.events.on(WebRTCEvents.IncomingAnswer, ((event: IncomingAnswerEvent) => {
        if (optionsRef.current.threadId && event.thid !== optionsRef.current.threadId) return
        optionsRef.current.onIncomingAnswer?.(event)
      }) as any)
      subscriptions.push(sub)
    }

    // Incoming ICE candidate
    if (optionsRef.current.onIncomingIce) {
      const sub = agent.events.on(WebRTCEvents.IncomingIce, ((event: IncomingIceEvent) => {
        if (optionsRef.current.threadId && event.thid !== optionsRef.current.threadId) return
        optionsRef.current.onIncomingIce?.(event)
      }) as any)
      subscriptions.push(sub)
    }

    // Renegotiation requested
    if (optionsRef.current.onRenegotiateRequested) {
      const sub = agent.events.on(WebRTCEvents.RenegotiateRequested, ((event: RenegotiateRequestedEvent) => {
        if (optionsRef.current.threadId && event.thid !== optionsRef.current.threadId) return
        optionsRef.current.onRenegotiateRequested?.(event)
      }) as any)
      subscriptions.push(sub)
    }

    // Call ended
    if (optionsRef.current.onCallEnded) {
      const sub = agent.events.on(WebRTCEvents.CallEnded, ((event: CallEndedEvent) => {
        if (optionsRef.current.threadId && event.thid !== optionsRef.current.threadId) return
        optionsRef.current.onCallEnded?.(event)
      }) as any)
      subscriptions.push(sub)
    }

    return () => {
      subscriptions.forEach((sub) => { try { sub?.off?.() } catch {} })
    }
  }, [agent])
}

export type {
  IncomingOfferEvent,
  IncomingAnswerEvent,
  IncomingIceEvent,
  CallEndedEvent,
  IncomingProposeEvent,
  RenegotiateRequestedEvent,
}
