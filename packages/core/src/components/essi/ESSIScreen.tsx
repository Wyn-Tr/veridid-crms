import React from 'react'
import { View, Text, StyleSheet, ScrollView, StatusBar, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import FeatherIcon from 'react-native-vector-icons/Feather'
import { palette, spacing, typography } from '../../theme/essi'

type SafeAreaEdge = 'top' | 'left' | 'right' | 'bottom'

interface ESSIScreenProps {
  children: React.ReactNode
  headerTitle?: string
  headerLeft?: React.ReactNode | 'back'
  headerRight?: React.ReactNode
  onHeaderLeftPress?: () => void
  scrollable?: boolean
  testID?: string
  safeAreaEdges?: SafeAreaEdge[]
}

export const ESSIScreen: React.FC<ESSIScreenProps> = ({
  children,
  headerTitle,
  headerLeft,
  headerRight,
  onHeaderLeftPress,
  scrollable = true,
  testID,
  safeAreaEdges = ['left', 'right', 'bottom'],
}) => {
  const renderHeaderLeft = () => {
    if (headerLeft === 'back') {
      return (
        <Pressable
          onPress={onHeaderLeftPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          testID={`${testID}-back-button`}
        >
          <FeatherIcon name="arrow-left" size={24} color={palette.text} />
        </Pressable>
      )
    }
    return headerLeft
  }

  const renderHeaderRight = () => {
    if (typeof headerRight === 'string') {
      return <Text style={styles.headerRightText}>{headerRight}</Text>
    }
    return headerRight
  }
  const content = scrollable ? (
    <ScrollView
      testID={`${testID}-scroll`}
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View testID={`${testID}-view`} style={styles.contentContainer}>
      {children}
    </View>
  )

  return (
    <View style={styles.container} testID={testID}>
      <StatusBar barStyle="light-content" backgroundColor={palette.background} />
      <SafeAreaView style={styles.safeArea} edges={safeAreaEdges}>
        {(headerTitle || headerLeft || headerRight) && (
          <View style={styles.header}>
            <View style={styles.headerLeft}>{renderHeaderLeft()}</View>
            {headerTitle && (
              <Text style={styles.headerTitle} numberOfLines={1}>
                {headerTitle}
              </Text>
            )}
            <View style={styles.headerRight}>{renderHeaderRight()}</View>
          </View>
        )}
        {content}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.outline,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerTitle: {
    ...typography.headline,
    color: palette.text,
    flex: 2,
    textAlign: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerRightText: {
    ...typography.body,
    color: palette.text,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.gutter,
    flexGrow: 1,
  },
})
