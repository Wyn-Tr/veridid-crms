import { BasicMessageRepository, ConnectionRecord } from '@credo-ts/core'
import { useAgent, useBasicMessagesByConnectionId, useConnectionById } from '@credo-ts/react-hooks'
import { CommonActions, useIsFocused, useNavigation } from '@react-navigation/native'
import { StackNavigationProp, StackScreenProps } from '@react-navigation/stack'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GiftedChat, IMessage, InputToolbar, Composer, Send } from 'react-native-gifted-chat'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { useNetwork } from '../../contexts/network'
import { useStore } from '../../contexts/store'
import { useChatMessagesByConnection } from '../../hooks/chat-messages'
import { useConnectionCapabilities } from '../../hooks/useConnectionCapabilities'
import { Role } from '../../types/chat'
import { BasicMessageMetadata, basicMessageCustomMetadata } from '../../types/metadata'
import { ContactStackParams, RootStackParams, Screens, Stacks, TabStacks } from '../../types/navigators'
import { getConnectionName } from '../../utils/helpers'
import { formatTime } from '../../utils/helpers'
import { palette, spacing, typography, radius } from '../../theme/essi'
import { CallbackType } from '../../components/chat/ChatMessage'

type ESSIChatProps = StackScreenProps<ContactStackParams, Screens.Chat>

interface ExtendedChatMessage extends IMessage {
  renderEvent?: () => JSX.Element
  createdAt: Date
  messageOpensCallbackType?: CallbackType
  onDetails?: () => void
}

const ESSIChat: React.FC<ESSIChatProps> = ({ route }) => {
  if (!route?.params) {
    throw new Error('Chat route params were not set properly')
  }

  const { connectionId } = route.params
  const [store] = useStore()
  const { t } = useTranslation()
  const { agent } = useAgent()
  const navigation = useNavigation<StackNavigationProp<ContactStackParams & RootStackParams>>()
  const connection = useConnectionById(connectionId) as ConnectionRecord
  const basicMessages = useBasicMessagesByConnectionId(connectionId)
  const chatMessages = useChatMessagesByConnection(connection)
  const isFocused = useIsFocused()
  const { assertNetworkConnected, silentAssertConnectedNetwork } = useNetwork()
  const [theirLabel, setTheirLabel] = useState(getConnectionName(connection, store.preferences.alternateContactNames))
  const insets = useSafeAreaInsets()
  const { capabilities, refresh } = useConnectionCapabilities(connectionId)

  // Bottom safe area for devices with home indicator
  // Since chat is full screen (no tab bar visible), we only need safe area
  const bottomOffset = insets.bottom

  useEffect(() => {
    setTheirLabel(getConnectionName(connection, store.preferences.alternateContactNames))
  }, [isFocused, connection, store.preferences.alternateContactNames])

  useEffect(() => {
    assertNetworkConnected()
  }, [assertNetworkConnected])

  // Mark messages as seen when chat is open
  useEffect(() => {
    basicMessages.forEach((msg) => {
      const meta = msg.metadata.get(BasicMessageMetadata.customMetadata) as basicMessageCustomMetadata
      if (agent && !meta?.seen) {
        msg.metadata.set(BasicMessageMetadata.customMetadata, { ...meta, seen: true })
        const basicMessageRepository = agent.context.dependencyManager.resolve(BasicMessageRepository)
        basicMessageRepository.update(agent.context, msg)
      }
    })
  }, [basicMessages, agent])

  const onSend = useCallback(
    async (messages: IMessage[]) => {
      await agent?.basicMessages.sendMessage(connectionId, messages[0].text)
    },
    [agent, connectionId]
  )

  const handleBackPress = () => {
    // Check if we can go back, otherwise navigate to Home
    if (navigation.canGoBack()) {
      navigation.goBack()
    } else {
      // Navigate to Home tab when there's no screen to go back to
      // This happens when Chat is opened from OOB invitation
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: Stacks.TabStack }],
        })
      )
    }
  }

  const handleInfoPress = () => {
    navigation.navigate(Screens.ContactDetails, { connectionId })
  }

  const handleRefreshCapabilities = useCallback(async () => {
    try {
      await refresh()
    } catch {
      // No-op: capability refresh errors are handled inside the hook
    }
  }, [refresh])

  const getCallbackButtonText = (callbackType: CallbackType) => {
    switch (callbackType) {
      case CallbackType.CredentialOffer:
        return t('Chat.ViewOffer')
      case CallbackType.ProofRequest:
        return t('Chat.ViewRequest')
      case CallbackType.PresentationSent:
        return t('Chat.OpenPresentation')
      default:
        return t('Chat.OpenItem')
    }
  }

  const getCallbackIcon = (callbackType: CallbackType) => {
    switch (callbackType) {
      case CallbackType.CredentialOffer:
        return 'credit-card'
      case CallbackType.ProofRequest:
        return 'file-text'
      case CallbackType.PresentationSent:
        return 'check-circle'
      default:
        return 'file'
    }
  }

  const renderBubble = (props: any) => {
    const message = props.currentMessage as ExtendedChatMessage
    const isMe = message.user._id === Role.me
    const hasCallback = message.messageOpensCallbackType !== undefined

    // For credential/proof events with callbacks, render a special card
    if (hasCallback && message.messageOpensCallbackType) {
      return (
        <View style={[styles.bubbleContainer, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
          <View style={[styles.eventCard, isMe ? styles.eventCardRight : styles.eventCardLeft]}>
            {/* Icon */}
            <View style={styles.eventIconContainer}>
              <FeatherIcon
                name={getCallbackIcon(message.messageOpensCallbackType)}
                size={32}
                color={palette.primary}
              />
            </View>

            {/* Event text */}
            <Text style={styles.eventText}>{message.text}</Text>

            {/* Time */}
            <Text style={styles.eventTimeText}>
              {formatTime(message.createdAt, { includeHour: true, chatFormat: true, trim: true })}
            </Text>

            {/* Action button */}
            <Pressable
              style={styles.eventButton}
              onPress={() => message.onDetails?.()}
            >
              <Text style={styles.eventButtonText}>
                {getCallbackButtonText(message.messageOpensCallbackType)}
              </Text>
              <FeatherIcon name="chevron-right" size={16} color={palette.text} />
            </Pressable>
          </View>
        </View>
      )
    }

    // Regular message bubble
    return (
      <View style={[styles.bubbleContainer, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
        <View style={[styles.bubble, isMe ? styles.bubbleStyleRight : styles.bubbleStyleLeft]}>
          {message.renderEvent ? (
            <Text style={[styles.messageText, isMe ? styles.messageTextRight : styles.messageTextLeft]}>
              {message.text}
            </Text>
          ) : (
            <Text style={[styles.messageText, isMe ? styles.messageTextRight : styles.messageTextLeft]}>
              {message.text}
            </Text>
          )}
          <Text style={styles.timeText}>
            {formatTime(message.createdAt, { includeHour: true, chatFormat: true, trim: true })}
          </Text>
        </View>
      </View>
    )
  }

  const renderInputToolbar = (props: any) => (
    <InputToolbar
      {...props}
      containerStyle={styles.inputToolbar}
      primaryStyle={styles.inputPrimary}
    />
  )

  const renderComposer = (props: any) => (
    <Composer
      {...props}
      textInputStyle={styles.composerText}
      placeholder={t('Contacts.TypeHere')}
      placeholderTextColor={palette.muted}
      textInputProps={{ accessibilityLabel: '', maxFontSizeMultiplier: 1.2 }}
    />
  )

  const renderSend = (props: any) => (
    <Send {...props} alwaysShowSend={true} disabled={!props.text} containerStyle={styles.sendContainer}>
      <View style={[styles.sendButton, !props.text && styles.sendButtonDisabled]}>
        <FeatherIcon name="send" size={20} color={props.text ? palette.text : palette.muted} />
      </View>
    </Send>
  )

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: spacing.sm }]}>
        <Pressable onPress={handleBackPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <FeatherIcon name="arrow-left" size={24} color={palette.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.avatarSmall}>
            <FeatherIcon name="user" size={16} color={palette.text} />
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {theirLabel}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {/* Video Call Button - only shown if peer supports WebRTC */}
          {capabilities.supportsWebRTC && (
            <Pressable
              onPress={() => navigation.navigate(Screens.VideoCall, { connectionId })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.headerButton}
            >
              <FeatherIcon name="video" size={22} color={palette.text} />
            </Pressable>
          )}
          {/* Refresh capabilities if WebRTC isn't available yet */}
          {!capabilities.supportsWebRTC && !capabilities.isLoading && (
            <Pressable
              onPress={handleRefreshCapabilities}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.headerButton}
            >
              <FeatherIcon name="refresh-cw" size={20} color={palette.muted} />
            </Pressable>
          )}
          {/* Show loading indicator while discovering capabilities */}
          {capabilities.isLoading && (
            <View style={styles.headerButton}>
              <FeatherIcon name="loader" size={22} color={palette.muted} />
            </View>
          )}
          <Pressable onPress={handleInfoPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <FeatherIcon name="info" size={24} color={palette.text} />
          </Pressable>
        </View>
      </View>

      {/* Chat Content */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 0}
      >
        <GiftedChat
          messages={chatMessages}
          onSend={onSend}
          user={{ _id: Role.me }}
          renderBubble={renderBubble}
          renderInputToolbar={renderInputToolbar}
          renderComposer={renderComposer}
          renderSend={renderSend}
          renderAvatar={() => null}
          showAvatarForEveryMessage={false}
          alwaysShowSend
          disableComposer={!silentAssertConnectedNetwork()}
          keyboardShouldPersistTaps="handled"
          messagesContainerStyle={styles.messagesContainer}
          minInputToolbarHeight={60}
          bottomOffset={bottomOffset}
          isKeyboardInternallyHandled={true}
        />
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.outline,
    backgroundColor: palette.surface,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerTitle: {
    ...typography.bodyBold,
    color: palette.text,
    maxWidth: 200,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerButton: {
    padding: spacing.xxs,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: palette.background,
  },
  messagesContainer: {
    paddingBottom: spacing.md,
  },
  bubbleContainer: {
    marginVertical: spacing.xxs,
    marginHorizontal: spacing.gutter,
  },
  bubbleLeft: {
    alignItems: 'flex-start',
  },
  bubbleRight: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  bubbleStyleLeft: {
    backgroundColor: palette.surfaceSecondary,
    borderBottomLeftRadius: radius.xs,
  },
  bubbleStyleRight: {
    backgroundColor: palette.primary,
    borderBottomRightRadius: radius.xs,
  },
  messageText: {
    ...typography.body,
  },
  messageTextLeft: {
    color: palette.text,
  },
  messageTextRight: {
    color: palette.text,
  },
  timeText: {
    ...typography.caption,
    color: palette.muted,
    marginTop: spacing.xxs,
    alignSelf: 'flex-end',
  },
  eventCard: {
    maxWidth: '85%',
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: palette.surfaceSecondary,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  eventCardLeft: {
    borderBottomLeftRadius: radius.xs,
  },
  eventCardRight: {
    borderBottomRightRadius: radius.xs,
  },
  eventIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  eventText: {
    ...typography.body,
    color: palette.text,
    marginBottom: spacing.xs,
  },
  eventTimeText: {
    ...typography.caption,
    color: palette.muted,
    marginBottom: spacing.md,
  },
  eventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  eventButtonText: {
    ...typography.bodyBold,
    color: palette.text,
  },
  inputToolbar: {
    backgroundColor: palette.surface,
    borderTopWidth: 1,
    borderTopColor: palette.outline,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  inputPrimary: {
    alignItems: 'center',
  },
  composerText: {
    ...typography.body,
    color: palette.text,
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    marginRight: spacing.sm,
    maxHeight: 100,
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: palette.surfaceSecondary,
  },
})

export default ESSIChat
