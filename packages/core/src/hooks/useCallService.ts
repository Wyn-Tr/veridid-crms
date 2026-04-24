import { useState, useCallback, useRef, useEffect } from 'react'
import { useAgent } from '@credo-ts/react-hooks'
import type { MediaStream } from 'react-native-webrtc'
import { CallService, CallState } from '../services/CallService'
import type { BifoldAgent } from '../utils/agent'
import { TOKENS, useServices } from '../container-api'

interface UseCallServiceReturn {
  /** Current call state */
  callState: CallState
  /** Local media stream (camera/mic) */
  localStream: MediaStream | null
  /** Remote media stream (peer's camera/mic) */
  remoteStream: MediaStream | null
  /** Whether microphone is muted */
  isMuted: boolean
  /** Whether camera is off */
  isCameraOff: boolean
  /** Start an outgoing call */
  startCall: (connectionId: string, video?: boolean) => Promise<string>
  /** Accept an incoming call */
  acceptCall: (connectionId: string, threadId: string, sdp: string, video?: boolean, iceServers?: Array<{ urls: string | string[]; username?: string; credential?: string }>) => Promise<void>
  /** End the current call */
  endCall: () => Promise<void>
  /** Toggle microphone mute */
  toggleMute: () => void
  /** Toggle camera on/off */
  toggleCamera: () => void
  /** Switch between front/back camera */
  switchCamera: () => Promise<void>
  /** Whether a call is currently active */
  isInCall: boolean
}

type IceServerConfig = { urls: string | string[]; username?: string; credential?: string }

/**
 * React hook for managing WebRTC video/audio calls.
 *
 * @example
 * ```tsx
 * const {
 *   callState,
 *   localStream,
 *   remoteStream,
 *   startCall,
 *   endCall,
 *   toggleMute,
 * } = useCallService()
 *
 * // Start a video call
 * const threadId = await startCall(connectionId, true)
 *
 * // Display streams
 * <RTCView streamURL={localStream?.toURL()} />
 * <RTCView streamURL={remoteStream?.toURL()} />
 *
 * // End call
 * await endCall()
 * ```
 */
export function useCallService(): UseCallServiceReturn {
  const { agent } = useAgent()
  const [{ webrtc: webrtcConfig }] = useServices([TOKENS.CONFIG])
  const [callState, setCallState] = useState<CallState>('idle')
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const serviceRef = useRef<CallService | null>(null)

  useEffect(() => {
    if (agent && !serviceRef.current) {
      // Check if WebRTC module is available
      const bifoldAgent = agent as BifoldAgent
      if (!bifoldAgent?.modules?.webrtc) {
        return
      }

      try {
        console.log('[useCallService] Creating CallService')
        serviceRef.current = new CallService({
          agent: bifoldAgent,
          getIceServers: async (): Promise<IceServerConfig[] | undefined> => {
            const url = webrtcConfig?.iceServersUrl
            if (!url) return
            const response = await fetch(url)
            if (!response.ok) {
              throw new Error(`Failed to fetch ICE servers (${response.status})`)
            }
            const data = await response.json()
            return data?.iceServers as IceServerConfig[] | undefined
          },
          onStateChange: (state) => {
            console.log('[useCallService] State changed:', state)
            setCallState(state)
            // Reset mute/camera states when call ends
            if (state === 'idle') {
              setIsMuted(false)
              setIsCameraOff(false)
              setLocalStream(null)
              setRemoteStream(null)
            }
          },
          onLocalStream: (stream) => {
            setLocalStream(stream)
          },
          onRemoteStream: (stream) => {
            setRemoteStream(stream)
          },
          onError: () => {
            // Error handled via state change
          },
        })
      } catch {
        // Failed to create CallService - agent may not be ready
      }
    }

    return () => {
      if (serviceRef.current) {
        try {
          serviceRef.current.destroy()
        } catch { /* cleanup */ }
        serviceRef.current = null
      }
    }
  }, [agent, webrtcConfig?.iceServersUrl])

  const startCall = useCallback(async (connectionId: string, video = true): Promise<string> => {
    if (!serviceRef.current) {
      throw new Error('CallService not initialized - agent may not be ready')
    }
    return serviceRef.current.startCall(connectionId, video)
  }, [])

  const acceptCall = useCallback(async (connectionId: string, threadId: string, sdp: string, video = true, iceServers?: Array<{ urls: string | string[]; username?: string; credential?: string }>): Promise<void> => {
    if (!serviceRef.current) {
      throw new Error('CallService not initialized - agent may not be ready')
    }
    return serviceRef.current.acceptCall(connectionId, threadId, sdp, video, iceServers)
  }, [])

  const endCall = useCallback(async (): Promise<void> => {
    if (!serviceRef.current) return
    await serviceRef.current.endCall()
  }, [])

  const toggleMute = useCallback((): void => {
    if (!serviceRef.current) return
    const muted = serviceRef.current.toggleMute()
    setIsMuted(muted)
  }, [])

  const toggleCamera = useCallback((): void => {
    if (!serviceRef.current) return
    const off = serviceRef.current.toggleCamera()
    setIsCameraOff(off)
  }, [])

  const switchCamera = useCallback(async (): Promise<void> => {
    if (!serviceRef.current) return
    await serviceRef.current.switchCamera()
  }, [])

  const isInCall = callState === 'calling' || callState === 'ringing' || callState === 'connected'

  return {
    callState,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    startCall,
    acceptCall,
    endCall,
    toggleMute,
    toggleCamera,
    switchCamera,
    isInCall,
  }
}
