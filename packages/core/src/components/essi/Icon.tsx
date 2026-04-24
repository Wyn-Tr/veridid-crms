import React from 'react'
import FeatherIcon from 'react-native-vector-icons/Feather'

export type IconName =
  | 'home'
  | 'users'
  | 'credit-card'
  | 'settings'
  | 'camera'
  | 'chevron-right'
  | 'chevron-left'
  | 'x'
  | 'check'
  | 'alert-circle'
  | 'info'
  | 'menu'
  | 'more-vertical'
  | 'plus'
  | 'minus'
  | 'edit'
  | 'trash-2'
  | 'eye'
  | 'eye-off'
  | 'lock'
  | 'unlock'
  | 'mail'
  | 'phone'
  | 'user'
  | 'search'
  | 'filter'
  | 'download'
  | 'upload'
  | 'share'
  | 'link'
  | 'external-link'
  | 'file'
  | 'folder'
  | 'bell'
  | 'bell-off'
  | 'star'
  | 'heart'
  | 'bookmark'
  | 'calendar'
  | 'clock'
  | 'map-pin'
  | 'send'
  | 'image'
  | 'paperclip'
  | 'award'
  | 'shield'
  | 'log-out'
  | 'refresh-cw'
  | 'copy'
  | 'check-circle'
  | 'x-circle'
  | 'alert-triangle'

interface IconProps {
  name: IconName
  size?: number
  color?: string
  style?: any
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, color = '#FFFFFF', style }) => {
  return <FeatherIcon name={name} size={size} color={color} style={style} />
}
