import React, { useEffect, useState, useRef, useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, Text, StatusBar } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RTCView } from 'react-native-webrtc'
import { StackScreenProps } from '@react-navigation/stack'
import FeatherIcon from 'react-native-vector-icons/Feather'
import { useConnectionById } from '@credo-ts/react-hooks'

import { useCallService } from '../../hooks/useCallService'
import { RootStackParams, Screens } from '../../types/navigators'
import { useTheme } from '../../contexts/theme'
import { useStore } from '../../contexts/store'
import { getConnectionName } from '../../utils/helpers'

type Props = StackScreenProps<RootStackParams, Screens.VideoCall>

const ESSIVideoCall: React.FC<Props> = ({ route, navigation }) => {
  const { connectionId, threadId, video = true } = route.params || {}
  // Check for incoming call params (passed from IncomingCall screen)
  const isIncoming = (route.params as any)?.isIncoming
  const remoteSdp = (route.params as any)?.remoteSdp
  const iceServers = (route.params as any)?.iceServers

  const connection = useConnectionById(connectionId)
  const [store] = useStore()
  const { ColorPalette } = useTheme()
  const insets = useSafeAreaInsets()
  const contactName = connection ? getConnectionName(connection, store.preferences.alternateContactNames) : 'Unknown'
  const [callInitialized, setCallInitialized] = useState(false)
  const isNavigatingRef = useRef(false)

  // Theme colors
  const darkBg = ColorPalette.grayscale.black
  const darkBgSecondary = ColorPalette.grayscale.darkGrey
  const textLight = ColorPalette.grayscale.white
  const textMuted = ColorPalette.grayscale.mediumGrey
  const errorColor = ColorPalette.semantic.error

  const {
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
  } = useCallService()

  // Initialize call on mount
  useEffect(() => {
    if (callInitialized) return

    const initCall = async () => {
      try {
        if (isIncoming && threadId && remoteSdp) {
          await acceptCall(connectionId, threadId, remoteSdp, video, iceServers)
        } else {
          await startCall(connectionId, video)
        }
        setCallInitialized(true)
      } catch {
        if (!isNavigatingRef.current) {
          isNavigatingRef.current = true
          navigation.goBack()
        }
      }
    }

    initCall()
  }, [connectionId, threadId, isIncoming, remoteSdp, iceServers, video, acceptCall, startCall, callInitialized, navigation])

  // Handle call ended
  useEffect(() => {
    if (callState === 'ended' && callInitialized && !isNavigatingRef.current) {
      isNavigatingRef.current = true
      navigation.goBack()
    }
  }, [callState, callInitialized, navigation])

  const handleEndCall = async () => {
    if (isNavigatingRef.current) return
    isNavigatingRef.current = true
    await endCall()
    navigation.goBack()
  }

  const getStatusText = () => {
    switch (callState) {
      case 'calling':
        return 'Calling...'
      case 'ringing':
        return 'Ringing...'
      case 'connected':
        return 'Connected'
      default:
        return 'Connecting...'
    }
  }

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: darkBg,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
    },
    remoteVideo: {
      flex: 1,
      backgroundColor: darkBgSecondary,
    },
    remoteVideoPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: darkBgSecondary,
    },
    avatarLarge: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: darkBgSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    statusText: {
      color: textMuted,
      fontSize: 18,
    },
    localVideoContainer: {
      position: 'absolute',
      top: insets.top + 100,
      right: 20,
      width: 110,
      height: 150,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.3)',
      backgroundColor: darkBg,
    },
    localVideo: {
      flex: 1,
    },
    topBar: {
      position: 'absolute',
      top: insets.top + 10,
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    contactName: {
      color: textLight,
      fontSize: 22,
      fontWeight: 'bold',
      textShadowColor: 'rgba(0,0,0,0.7)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    callStatus: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 14,
      marginTop: 4,
      textShadowColor: 'rgba(0,0,0,0.7)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    controlsContainer: {
      position: 'absolute',
      bottom: insets.bottom + 40,
      left: 0,
      right: 0,
      paddingHorizontal: 20,
    },
    controls: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
    },
    controlButton: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: darkBgSecondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    controlButtonActive: {
      backgroundColor: ColorPalette.brand.primary,
    },
    controlLabel: {
      color: textLight,
      fontSize: 10,
      marginTop: 2,
    },
    controlLabelActive: {
      color: textLight,
    },
    endCallButton: {
      backgroundColor: errorColor,
      width: 72,
      height: 72,
      borderRadius: 36,
    },
    endCallLabel: {
      color: textLight,
    },
  }), [darkBg, darkBgSecondary, textLight, textMuted, errorColor, ColorPalette, insets])

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Remote Video (Full Screen) */}
      {remoteStream ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
          zOrder={0}
        />
      ) : (
        <View style={styles.remoteVideoPlaceholder}>
          <View style={styles.avatarLarge}>
            <FeatherIcon name="user" size={64} color={textMuted} />
          </View>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      )}

      {/* Local Video (Picture-in-Picture) */}
      {localStream && !isCameraOff && (
        <TouchableOpacity style={styles.localVideoContainer} activeOpacity={0.9}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror={true}
            zOrder={1}
          />
        </TouchableOpacity>
      )}

      {/* Top Bar - Contact Info */}
      <View style={styles.topBar}>
        <Text style={styles.contactName}>{contactName}</Text>
        <Text style={styles.callStatus}>{getStatusText()}</Text>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controls}>
          {/* Mute Button */}
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={toggleMute}
            activeOpacity={0.7}
          >
            <FeatherIcon
              name={isMuted ? 'mic-off' : 'mic'}
              size={24}
              color={textLight}
            />
            <Text style={[styles.controlLabel, isMuted && styles.controlLabelActive]}>
              {isMuted ? 'Unmute' : 'Mute'}
            </Text>
          </TouchableOpacity>

          {/* End Call Button */}
          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={handleEndCall}
            activeOpacity={0.7}
          >
            <FeatherIcon name="phone-off" size={28} color={textLight} />
            <Text style={[styles.controlLabel, styles.endCallLabel]}>End</Text>
          </TouchableOpacity>

          {/* Camera Toggle */}
          <TouchableOpacity
            style={[styles.controlButton, isCameraOff && styles.controlButtonActive]}
            onPress={toggleCamera}
            activeOpacity={0.7}
          >
            <FeatherIcon
              name={isCameraOff ? 'video-off' : 'video'}
              size={24}
              color={textLight}
            />
            <Text style={[styles.controlLabel, isCameraOff && styles.controlLabelActive]}>
              {isCameraOff ? 'Show' : 'Hide'}
            </Text>
          </TouchableOpacity>

          {/* Switch Camera */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={switchCamera}
            activeOpacity={0.7}
          >
            <FeatherIcon name="refresh-cw" size={24} color={textLight} />
            <Text style={styles.controlLabel}>Flip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

export default ESSIVideoCall
