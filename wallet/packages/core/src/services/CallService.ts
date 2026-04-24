import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc'
import { WebRTCEvents } from '@ajna-inc/webrtc'
import type { BifoldAgent } from '../utils/agent'

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended'

type IceServerConfig = { urls: string | string[]; username?: string; credential?: string }

export interface CallServiceOptions {
  agent: BifoldAgent
  getIceServers?: () => Promise<IceServerConfig[] | undefined>
  onStateChange?: (state: CallState) => void
  onLocalStream?: (stream: MediaStream) => void
  onRemoteStream?: (stream: MediaStream) => void
  onError?: (error: Error) => void
}

export class CallService {
  private agent: BifoldAgent
  // Using 'any' because react-native-webrtc types don't include all WebRTC event handlers
  private pc: any = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private connectionId: string | null = null
  private threadId: string | null = null
  private state: CallState = 'idle'
  private eventSubscriptions: (() => void)[] = []
  private pendingIceCandidates: any[] = []
  private hasRemoteDescription = false

  private onStateChange?: (state: CallState) => void
  private onLocalStream?: (stream: MediaStream) => void
  private onRemoteStream?: (stream: MediaStream) => void
  private onError?: (error: Error) => void
  private getIceServers?: () => Promise<IceServerConfig[] | undefined>

  constructor(options: CallServiceOptions) {
    this.agent = options.agent
    this.getIceServers = options.getIceServers
    this.onStateChange = options.onStateChange
    this.onLocalStream = options.onLocalStream
    this.onRemoteStream = options.onRemoteStream
    this.onError = options.onError

    // Validate agent has webrtc module
    if (!this.agent?.modules?.webrtc) {
      throw new Error('WebRTC module not configured in agent')
    }

    this.subscribeToEvents()
  }

  private subscribeToEvents() {
    try {
      // Subscribe to WebRTC events from agent
      // NOTE: Events are emitted with { type, payload: { thid, sdp, ... } } structure
      const answerSub = this.agent.events.on(WebRTCEvents.IncomingAnswer, async (event: any) => {
        const payload = event.payload || event
        if (payload?.thid === this.threadId && this.pc) {
          try {
            await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: payload.sdp }))
            this.hasRemoteDescription = true
            await this.processPendingIceCandidates()
            this.setState('connected')
          } catch (err) {
            this.onError?.(err as Error)
          }
        }
      })

      const iceSub = this.agent.events.on(WebRTCEvents.IncomingIce, async (event: any) => {
        const payload = event.payload || event
        if (payload?.thid === this.threadId && this.pc) {
          try {
            if (payload.candidate && !payload.endOfCandidates) {
              const candidate = new RTCIceCandidate(payload.candidate as any)
              if (this.hasRemoteDescription) {
                await this.pc.addIceCandidate(candidate)
              } else {
                this.pendingIceCandidates.push(candidate)
              }
            }
          } catch {
            // ICE candidate error - silently ignored
          }
        }
      })

      const endSub = this.agent.events.on(WebRTCEvents.CallEnded, (event: any) => {
        const payload = event.payload || event
        if (payload?.thid === this.threadId) {
          this.cleanup()
        }
      })

      this.eventSubscriptions = [
        () => { try { (answerSub as any)?.off?.() } catch { /* cleanup */ } },
        () => { try { (iceSub as any)?.off?.() } catch { /* cleanup */ } },
        () => { try { (endSub as any)?.off?.() } catch { /* cleanup */ } },
      ]
    } catch (err) {
      this.onError?.(err as Error)
    }
  }

  private async processPendingIceCandidates() {
    if (this.pendingIceCandidates.length > 0 && this.pc) {
      for (const candidate of this.pendingIceCandidates) {
        try {
          await this.pc.addIceCandidate(candidate)
        } catch {
          // Buffered ICE candidate error - silently ignored
        }
      }
      this.pendingIceCandidates = []
    }
  }

  private setState(newState: CallState) {
    this.state = newState
    this.onStateChange?.(newState)
  }

  getState(): CallState {
    return this.state
  }

  async startCall(connectionId: string, video: boolean = true): Promise<string> {
    this.connectionId = connectionId
    this.threadId = this.generateUUID()
    this.setState('calling')
    this.hasRemoteDescription = false
    this.pendingIceCandidates = []

    try {
      // Get local media
      this.localStream = await mediaDevices.getUserMedia({
        audio: true,
        video: video ? { facingMode: 'user' } : false,
      }) as MediaStream
      this.onLocalStream?.(this.localStream)

      // Create peer connection with ICE servers from module
      const iceServers = (await this.getIceServers?.()) ?? this.agent.modules.webrtc.getDefaultIceServers()
      this.pc = new RTCPeerConnection({ iceServers })

      // Add local tracks
      this.localStream.getTracks().forEach((track: any) => {
        this.pc!.addTrack(track, this.localStream!)
      })

      // Handle remote tracks (for startCall - we're the caller)
      this.pc.ontrack = (event: any) => {
        if (event.streams && event.streams[0]) {
          const stream = event.streams[0]
          this.remoteStream = stream
          this.onRemoteStream?.(this.remoteStream!)
        } else if (event.track) {
          // Fallback: create stream from track if no stream provided
          if (!this.remoteStream) {
            this.remoteStream = new MediaStream() as any
          }
          (this.remoteStream as any).addTrack(event.track)
          this.onRemoteStream?.(this.remoteStream!)
        }
      }

      // Handle ICE candidates
      this.pc.onicecandidate = async (event: any) => {
        if (event.candidate) {
          try {
            await this.agent.modules.webrtc.sendIce({
              connectionId: this.connectionId!,
              threadId: this.threadId!,
              candidate: event.candidate.toJSON(),
            })
          } catch {
            // Error sending ICE candidate - silently ignored
          }
        } else {
          // ICE gathering complete
          await this.agent.modules.webrtc.sendIce({
            connectionId: this.connectionId!,
            threadId: this.threadId!,
            endOfCandidates: true,
          })
        }
      }

      // Monitor ICE connection state
      this.pc.oniceconnectionstatechange = () => {
        if (this.pc?.iceConnectionState === 'connected' || this.pc?.iceConnectionState === 'completed') {
          this.setState('connected')
        } else if (this.pc?.iceConnectionState === 'failed') {
          this.onError?.(new Error('ICE connection failed'))
        }
      }

      // Monitor overall connection state
      this.pc.onconnectionstatechange = () => {
        if (this.pc?.connectionState === 'connected') {
          this.setState('connected')
        } else if (this.pc?.connectionState === 'failed') {
          this.cleanup()
        }
      }

      // Create and send offer
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: video,
      })
      await this.pc.setLocalDescription(offer)

      await this.agent.modules.webrtc.startCall({
        connectionId,
        threadId: this.threadId,
        sdp: offer.sdp!,
        iceServers: iceServers as any,
      })

      return this.threadId
    } catch (err) {
      this.cleanup()
      throw err
    }
  }

  async acceptCall(connectionId: string, threadId: string, remoteSdp: string, video: boolean = true, callerIceServers?: Array<{ urls: string | string[]; username?: string; credential?: string }>): Promise<void> {
    this.connectionId = connectionId
    this.threadId = threadId
    this.setState('ringing')
    this.hasRemoteDescription = false
    this.pendingIceCandidates = []

    try {
      // Get local media
      this.localStream = await mediaDevices.getUserMedia({
        audio: true,
        video: video ? { facingMode: 'user' } : false,
      }) as MediaStream
      this.onLocalStream?.(this.localStream)

      // Create peer connection - use caller's ICE servers if provided (includes TURN)
      const defaultIceServers = (await this.getIceServers?.()) ?? this.agent.modules.webrtc.getDefaultIceServers()
      const iceServers = callerIceServers && callerIceServers.length > 0 ? callerIceServers : defaultIceServers
      this.pc = new RTCPeerConnection({ iceServers })

      // Add local tracks
      this.localStream.getTracks().forEach((track: any) => {
        this.pc!.addTrack(track, this.localStream!)
      })

      // Handle remote tracks (for acceptCall - we're the callee)
      this.pc.ontrack = (event: any) => {
        if (event.streams && event.streams[0]) {
          const stream = event.streams[0]
          this.remoteStream = stream
          this.onRemoteStream?.(this.remoteStream!)
        } else if (event.track) {
          // Fallback: create stream from track if no stream provided
          if (!this.remoteStream) {
            this.remoteStream = new MediaStream() as any
          }
          (this.remoteStream as any).addTrack(event.track)
          this.onRemoteStream?.(this.remoteStream!)
        }
      }

      // Handle ICE candidates
      this.pc.onicecandidate = async (event: any) => {
        if (event.candidate) {
          try {
            await this.agent.modules.webrtc.sendIce({
              connectionId: this.connectionId!,
              threadId: this.threadId!,
              candidate: event.candidate.toJSON(),
            })
          } catch {
            // Error sending ICE candidate - silently ignored
          }
        } else {
          // ICE gathering complete
          await this.agent.modules.webrtc.sendIce({
            connectionId: this.connectionId!,
            threadId: this.threadId!,
            endOfCandidates: true,
          })
        }
      }

      // Monitor connection state
      this.pc.oniceconnectionstatechange = () => {
        if (this.pc?.iceConnectionState === 'connected' || this.pc?.iceConnectionState === 'completed') {
          this.setState('connected')
        } else if (this.pc?.iceConnectionState === 'failed') {
          this.onError?.(new Error('ICE connection failed'))
        }
      }

      this.pc.onconnectionstatechange = () => {
        if (this.pc?.connectionState === 'failed') {
          this.cleanup()
        }
      }

      // Set remote description (offer)
      await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: remoteSdp }))
      this.hasRemoteDescription = true
      await this.processPendingIceCandidates()

      // Create and send answer
      const answer = await this.pc.createAnswer()
      await this.pc.setLocalDescription(answer)

      await this.agent.modules.webrtc.acceptCall({
        connectionId,
        threadId,
        sdp: answer.sdp!,
      })
    } catch (err) {
      this.cleanup()
      throw err
    }
  }

  async endCall(): Promise<void> {
    if (this.connectionId && this.threadId) {
      try {
        await this.agent.modules.webrtc.endCall({
          connectionId: this.connectionId,
          threadId: this.threadId,
          reason: 'hangup',
        })
      } catch {
        // Error sending end call - silently ignored
      }
    }
    this.cleanup()
  }

  toggleMute(): boolean {
    const audioTrack = this.localStream?.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      return !audioTrack.enabled
    }
    return false
  }

  toggleCamera(): boolean {
    const videoTrack = this.localStream?.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      return !videoTrack.enabled
    }
    return false
  }

  async switchCamera(): Promise<void> {
    const videoTrack = this.localStream?.getVideoTracks()[0] as any
    if (videoTrack && typeof videoTrack._switchCamera === 'function') {
      await videoTrack._switchCamera()
    }
  }

  private cleanup() {
    this.setState('ended')

    // Stop local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((t: any) => {
        try { t.stop() } catch {}
      })
      this.localStream = null
    }

    // Close peer connection
    if (this.pc) {
      try { this.pc.close() } catch {}
      this.pc = null
    }

    this.remoteStream = null
    this.connectionId = null
    this.threadId = null
    this.hasRemoteDescription = false
    this.pendingIceCandidates = []

    // Reset to idle after cleanup
    setTimeout(() => this.setState('idle'), 100)
  }

  destroy() {
    this.eventSubscriptions.forEach((unsub) => unsub())
    this.eventSubscriptions = []
    this.cleanup()
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }
}
