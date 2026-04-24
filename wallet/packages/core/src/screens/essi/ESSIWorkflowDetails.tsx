import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StackScreenProps } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { ESSIScreen, ESSIButton } from '../../components/essi'
import { useWorkflowInstance, WorkflowAction, WorkflowUiHint } from '../../hooks/useWorkflowInstance'
import { useWorkflowEvents } from '../../hooks/useWorkflowEvents'
import { palette, spacing, typography, radius } from '../../theme/essi'
import { testIdWithKey } from '../../utils/testable'
import { RootStackParams, Screens } from '../../types/navigators'

type ESSIWorkflowDetailsProps = StackScreenProps<RootStackParams, Screens.WorkflowDetails>

// ========================================
// JSON Schema Form Renderer Types & Utils
// ========================================

interface SchemaProperty {
  type: string
  title?: string
  description?: string
  properties?: Record<string, SchemaProperty>
  required?: string[]
  enum?: string[]
}

interface FlattenedField {
  path: string[]
  key: string
  title: string
  type: string
  required: boolean
  description?: string
  enumOptions?: string[]
}

/**
 * Flatten a JSON Schema into a list of renderable fields
 */
function flattenSchema(
  schema: SchemaProperty,
  path: string[] = [],
  requiredFields: string[] = []
): FlattenedField[] {
  const fields: FlattenedField[] = []

  if (schema.type === 'object' && schema.properties) {
    const required = schema.required ?? []
    for (const [key, prop] of Object.entries(schema.properties)) {
      const newPath = [...path, key]
      if (prop.type === 'object' && prop.properties) {
        // Recurse into nested objects
        fields.push(...flattenSchema(prop, newPath, prop.required ?? []))
      } else {
        // Leaf field
        fields.push({
          path: newPath,
          key,
          title: prop.title ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
          type: prop.type,
          required: required.includes(key),
          description: prop.description,
          enumOptions: prop.enum,
        })
      }
    }
  }

  return fields
}

/**
 * Build a nested object from flat form values
 */
function buildNestedObject(fields: FlattenedField[], values: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const field of fields) {
    const value = values[field.path.join('.')]
    if (value === undefined || value === '') continue

    let current: Record<string, unknown> = result
    for (let i = 0; i < field.path.length - 1; i++) {
      const segment = field.path[i]
      if (!current[segment]) {
        current[segment] = {}
      }
      current = current[segment] as Record<string, unknown>
    }
    current[field.path[field.path.length - 1]] = value
  }

  return result
}

/**
 * Flatten context object for display - handles nested objects like { profile: { name: "...", idNumber: "..." } }
 */
function flattenContextForDisplay(
  context: Record<string, unknown>,
  prefix: string = ''
): { label: string; value: string }[] {
  const result: { label: string; value: string }[] = []

  for (const [key, val] of Object.entries(context)) {
    // Skip internal keys
    if (key.startsWith('_')) continue

    const label = prefix
      ? `${prefix} ${key.replace(/([A-Z])/g, ' $1').trim()}`
      : key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()

    if (val && typeof val === 'object' && !Array.isArray(val)) {
      // Recurse into nested objects
      result.push(...flattenContextForDisplay(val as Record<string, unknown>, label))
    } else if (val !== null && val !== undefined && val !== '') {
      // Leaf value - format nicely
      const displayValue = Array.isArray(val) ? val.join(', ') : String(val)
      result.push({ label, value: displayValue })
    }
  }

  return result
}

// State configuration for icons and colors
const stateConfig: Record<string, { icon: string; color: string }> = {
  pending: { icon: 'clock', color: palette.warning },
  in_progress: { icon: 'loader', color: palette.primary },
  awaiting_input: { icon: 'edit-3', color: palette.accent },
  completed: { icon: 'check-circle', color: palette.success },
  failed: { icon: 'x-circle', color: palette.danger },
  cancelled: { icon: 'slash', color: palette.muted },
  default: { icon: 'git-branch', color: palette.primary },
}

interface ActionButtonProps {
  action: WorkflowAction
  onPress: () => void
  loading: boolean
  isPrimary: boolean
}

const ActionButton: React.FC<ActionButtonProps> = ({ action, onPress, loading, isPrimary }) => {
  const label = action.label || action.event.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <View style={styles.actionButtonContainer}>
      <ESSIButton
        title={label}
        onPress={onPress}
        variant={isPrimary ? 'primary' : 'outline'}
        loading={loading}
        disabled={loading}
        testID={testIdWithKey(`WorkflowAction-${action.event}`)}
      />
    </View>
  )
}

interface UiHintRendererProps {
  hint: WorkflowUiHint
  onAction?: (event: string, input?: Record<string, unknown>) => void
  loading?: boolean
  formValues: Record<string, string>
  onFormChange: (key: string, value: string) => void
}

/**
 * SchemaFormField - renders a single input field from JSON Schema
 */
interface SchemaFormFieldProps {
  field: FlattenedField
  value: string
  onChange: (value: string) => void
}

const SchemaFormField: React.FC<SchemaFormFieldProps> = ({ field, value, onChange }) => {
  const fieldKey = field.path.join('.')

  return (
    <View style={styles.formFieldContainer}>
      <Text style={styles.formFieldLabel}>
        {field.title}
        {field.required && <Text style={styles.requiredStar}> *</Text>}
      </Text>
      {field.description && (
        <Text style={styles.formFieldDescription}>{field.description}</Text>
      )}
      <TextInput
        style={styles.formFieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={`Enter ${field.title.toLowerCase()}...`}
        placeholderTextColor={palette.muted}
        autoCapitalize="none"
        autoCorrect={false}
        testID={testIdWithKey(`FormField-${fieldKey}`)}
      />
    </View>
  )
}

const UiHintRenderer: React.FC<UiHintRendererProps> = ({
  hint,
  onAction,
  loading,
  formValues,
  onFormChange,
}) => {
  // Parse input_schema if present - must be called unconditionally
  const schemaFields = useMemo(() => {
    if (hint.type === 'submit-button' && (hint as any).input_schema) {
      return flattenSchema((hint as any).input_schema)
    }
    return []
  }, [hint])

  const hasSchema = schemaFields.length > 0

  // Check if all required fields are filled - must be called unconditionally
  const isFormValid = useMemo(() => {
    if (!hasSchema) return true
    return schemaFields
      .filter(f => f.required)
      .every(f => {
        const val = formValues[f.path.join('.')]
        return val && val.trim().length > 0
      })
  }, [schemaFields, formValues, hasSchema])

  // Handle submit - must be defined unconditionally
  const handleSubmit = useCallback(() => {
    if (hasSchema) {
      const input = buildNestedObject(schemaFields, formValues)
      onAction?.(hint.event!, input)
    } else {
      onAction?.(hint.event!)
    }
  }, [hasSchema, schemaFields, formValues, onAction, hint.event])

  if (hint.type === 'text') {
    return <Text style={styles.uiText}>{hint.text}</Text>
  }

  if (hint.type === 'submit-button') {
    const label = hint.label || hint.event || 'Submit'

    return (
      <View style={styles.formContainer}>
        {/* Render form fields if input_schema exists */}
        {hasSchema && (
          <View style={styles.formFieldsContainer}>
            {schemaFields.map((field) => (
              <SchemaFormField
                key={field.path.join('.')}
                field={field}
                value={formValues[field.path.join('.')] ?? ''}
                onChange={(val) => onFormChange(field.path.join('.'), val)}
              />
            ))}
          </View>
        )}

        {/* Submit button */}
        <View style={styles.uiButtonContainer}>
          <ESSIButton
            title={label}
            onPress={handleSubmit}
            variant="primary"
            loading={loading}
            disabled={loading || !isFormValid}
          />
        </View>
      </View>
    )
  }

  if (hint.type === 'input') {
    return (
      <View style={styles.uiInputContainer}>
        <Text style={styles.uiInputLabel}>{hint.label || 'Input'}</Text>
        <TextInput
          style={styles.uiInput}
          value={formValues['_simple_input'] ?? ''}
          onChangeText={(val) => onFormChange('_simple_input', val)}
          placeholder="Enter value..."
          placeholderTextColor={palette.muted}
        />
      </View>
    )
  }

  if (hint.type === 'divider') {
    return <View style={styles.uiDivider} />
  }

  return null
}

const ESSIWorkflowDetails: React.FC<ESSIWorkflowDetailsProps> = ({ route, navigation }) => {
  const { instanceId } = route.params as { instanceId: string }
  const { t } = useTranslation()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const scrollViewRef = useRef<ScrollView>(null)
  const insets = useSafeAreaInsets()

  const {
    instance,
    status,
    loading,
    error,
    refresh,
    advance,
    actions,
    uiHints,
    isComplete,
    uiProfile,
    pause,
    resume,
    cancel,
  } = useWorkflowInstance(instanceId)

  // Clear form when workflow state changes
  const workflowState = (status as any)?.state
  useEffect(() => {
    setFormValues({})
  }, [workflowState])

  const handleFormChange = useCallback((key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }))
  }, [])

  // Subscribe to workflow events for real-time updates
  useWorkflowEvents({
    instanceId,
    onStateChanged: useCallback(() => {
      refresh()
    }, [refresh]),
    onStatusChanged: useCallback(() => {
      refresh()
    }, [refresh]),
    onCompleted: useCallback(() => {
      refresh()
    }, [refresh]),
  })

  const { icon, color } = useMemo(() => {
    const statusValue = (status as any)?.status?.toLowerCase() ?? 'default'
    return stateConfig[statusValue] ?? stateConfig.default
  }, [status])

  const templateName = useMemo(() => {
    const templateId = (status as any)?.template_id ?? (instance as any)?.templateId ?? 'Workflow'
    return templateId
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase())
  }, [status, instance])

  const currentState = useMemo(() => {
    const state = (status as any)?.state ?? 'Unknown'
    return state
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase())
  }, [status])

  const currentSection = (status as any)?.section ?? ''

  const handleAction = useCallback(
    async (event: string, input?: Record<string, unknown>) => {
      setActionLoading(event)
      try {
        await advance(event, input)
      } catch (e) {
        Alert.alert(
          t('Workflow.ActionFailed'),
          (e as Error).message || t('Workflow.ActionFailedDescription'),
          [{ text: t('Global.Okay') }]
        )
      } finally {
        setActionLoading(null)
      }
    },
    [advance, t]
  )

  // Workflow control handlers
  const handlePause = useCallback(() => {
    Alert.alert(
      t('Workflow.PauseWorkflow'),
      t('Workflow.PauseConfirmation'),
      [
        { text: t('Global.Cancel'), style: 'cancel' },
        {
          text: t('Global.Confirm'),
          onPress: async () => {
            try {
              await pause()
              refresh()
            } catch (e) {
              Alert.alert(
                t('Global.Failure'),
                (e as Error).message || t('Global.SomethingWentWrong'),
                [{ text: t('Global.Okay') }]
              )
            }
          },
        },
      ]
    )
  }, [pause, refresh, t])

  const handleResume = useCallback(() => {
    Alert.alert(
      t('Workflow.ResumeWorkflow'),
      t('Workflow.ResumeConfirmation'),
      [
        { text: t('Global.Cancel'), style: 'cancel' },
        {
          text: t('Global.Confirm'),
          onPress: async () => {
            try {
              await resume()
              refresh()
            } catch (e) {
              Alert.alert(
                t('Global.Failure'),
                (e as Error).message || t('Global.SomethingWentWrong'),
                [{ text: t('Global.Okay') }]
              )
            }
          },
        },
      ]
    )
  }, [resume, refresh, t])

  const handleCancel = useCallback(() => {
    Alert.alert(
      t('Workflow.CancelWorkflow'),
      t('Workflow.CancelConfirmation'),
      [
        { text: t('Global.Cancel'), style: 'cancel' },
        {
          text: t('Workflow.CancelWorkflow'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancel()
              refresh()
            } catch (e) {
              Alert.alert(
                t('Global.Failure'),
                (e as Error).message || t('Global.SomethingWentWrong'),
                [{ text: t('Global.Okay') }]
              )
            }
          },
        },
      ]
    )
  }, [cancel, refresh, t])

  // Show workflow menu with available actions
  const showWorkflowMenu = useCallback(() => {
    const workflowStatus = (status as any)?.status?.toLowerCase()
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = []

    // Add pause option if workflow is in progress
    if (workflowStatus === 'in_progress' || workflowStatus === 'awaiting_input') {
      options.push({
        text: t('Workflow.PauseWorkflow'),
        onPress: handlePause,
      })
    }

    // Add resume option if workflow is paused
    if (workflowStatus === 'paused') {
      options.push({
        text: t('Workflow.ResumeWorkflow'),
        onPress: handleResume,
      })
    }

    // Add cancel option if workflow is not complete
    if (!isComplete && workflowStatus !== 'cancelled' && workflowStatus !== 'failed') {
      options.push({
        text: t('Workflow.CancelWorkflow'),
        style: 'destructive',
        onPress: handleCancel,
      })
    }

    // Always add cancel button for the menu itself
    options.push({
      text: t('Global.Cancel'),
      style: 'cancel',
    })

    Alert.alert(
      t('Workflow.WorkflowActions'),
      undefined,
      options
    )
  }, [status, isComplete, handlePause, handleResume, handleCancel, t])

  // Check if menu should be shown (only for active workflows)
  const workflowStatus = (status as any)?.status?.toLowerCase()
  const showMenu = !isComplete && workflowStatus !== 'cancelled' && workflowStatus !== 'failed'

  // Menu button component
  const MenuButton = useMemo(() => {
    if (!showMenu) return null
    return (
      <Pressable
        onPress={showWorkflowMenu}
        style={({ pressed }) => [
          styles.menuButton,
          pressed && styles.menuButtonPressed,
        ]}
        testID={testIdWithKey('WorkflowMenuButton')}
        accessibilityLabel={t('Workflow.WorkflowActions')}
      >
        <FeatherIcon name="more-vertical" size={24} color={palette.text} />
      </Pressable>
    )
  }, [showMenu, showWorkflowMenu, t])

  // Loading state
  if (loading && !status) {
    return (
      <ESSIScreen
        headerTitle="Workflow"
        headerLeft="back"
        onHeaderLeftPress={() => navigation.goBack()}
        testID={testIdWithKey('ESSIWorkflowDetails')}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingText}>Loading workflow...</Text>
        </View>
      </ESSIScreen>
    )
  }

  // Error state
  if (error || !status) {
    return (
      <ESSIScreen
        headerTitle="Workflow"
        headerLeft="back"
        onHeaderLeftPress={() => navigation.goBack()}
        testID={testIdWithKey('ESSIWorkflowDetails')}
      >
        <View style={styles.errorContainer}>
          <FeatherIcon name="alert-circle" size={48} color={palette.danger} />
          <Text style={styles.errorTitle}>Failed to load workflow</Text>
          <Text style={styles.errorSubtitle}>{error?.message || 'Unknown error'}</Text>
          <View style={styles.retryButton}>
            <ESSIButton title="Retry" onPress={refresh} variant="outline" />
          </View>
        </View>
      </ESSIScreen>
    )
  }

  return (
    <ESSIScreen
      headerTitle={templateName}
      headerLeft="back"
      onHeaderLeftPress={() => navigation.goBack()}
      headerRight={MenuButton}
      scrollable={false}
      testID={testIdWithKey('ESSIWorkflowDetails')}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
        {/* State Card */}
        <View style={styles.stateCard}>
          <View style={[styles.stateIcon, { backgroundColor: color + '20' }]}>
            <FeatherIcon name={icon} size={36} color={color} />
          </View>
          <Text style={styles.stateName}>{currentState}</Text>
          {currentSection ? (
            <Text style={styles.sectionName}>{currentSection}</Text>
          ) : null}

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.statusBadgeText, { color }]}>
              {(status as any).status ?? 'Active'}
            </Text>
          </View>

          {/* Role Indicator */}
          {uiProfile && (
            <View style={styles.roleContainer}>
              <FeatherIcon
                name={uiProfile === 'sender' ? 'send' : 'inbox'}
                size={14}
                color={palette.muted}
              />
              <Text style={styles.roleText}>
                You are the {uiProfile === 'sender' ? 'Initiator' : 'Participant'}
              </Text>
            </View>
          )}
        </View>

        {/* UI Hints */}
        {uiHints.length > 0 && (
          <View style={styles.uiSection}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            {uiHints.map((hint: WorkflowUiHint, index: number) => (
              <UiHintRenderer
                key={index}
                hint={hint}
                onAction={handleAction}
                loading={actionLoading !== null}
                formValues={formValues}
                onFormChange={handleFormChange}
              />
            ))}
          </View>
        )}

        {/* Context Data */}
        {(status as any).context && Object.keys((status as any).context).length > 0 && (
          <View style={styles.contextSection}>
            <Text style={styles.sectionTitle}>Collected Information</Text>
            <View style={styles.contextCard}>
              {flattenContextForDisplay((status as any).context).map(({ label, value }, index, arr) => (
                <View
                  key={label}
                  style={[
                    styles.contextRow,
                    index === arr.length - 1 && styles.contextRowLast,
                  ]}
                >
                  <Text style={styles.contextKey}>{label}</Text>
                  <Text style={styles.contextValue} numberOfLines={2}>
                    {value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Completed State */}
        {isComplete && (
          <View style={styles.completeCard}>
            <FeatherIcon name="check-circle" size={32} color={palette.success} />
            <Text style={styles.completeText}>Workflow Complete</Text>
          </View>
        )}

        {/* Actions - moved inside ScrollView for better keyboard handling */}
        {!isComplete && actions.length > 0 && (
          <View style={styles.actionsContainer}>
            {actions.map((action: WorkflowAction, index: number) => (
              <ActionButton
                key={action.key || action.event}
                action={action}
                onPress={() => handleAction(action.event)}
                loading={actionLoading === action.event}
                isPrimary={index === 0}
              />
            ))}
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </ESSIScreen>
  )
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl * 2,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: palette.muted,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorTitle: {
    ...typography.headline,
    color: palette.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  errorSubtitle: {
    ...typography.body,
    color: palette.muted,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    minWidth: 120,
  },
  stateCard: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.outline,
    marginBottom: spacing.lg,
  },
  stateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  stateName: {
    ...typography.headline,
    color: palette.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  sectionName: {
    ...typography.body,
    color: palette.muted,
    marginBottom: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  statusBadgeText: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  roleText: {
    ...typography.caption,
    color: palette.muted,
  },
  uiSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.overline,
    color: palette.muted,
    marginBottom: spacing.sm,
  },
  uiText: {
    ...typography.body,
    color: palette.text,
    marginBottom: spacing.sm,
  },
  uiButtonContainer: {
    marginTop: spacing.sm,
  },
  uiInputContainer: {
    marginBottom: spacing.md,
  },
  uiInputLabel: {
    ...typography.caption,
    color: palette.muted,
    marginBottom: spacing.xs,
  },
  uiInput: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.outline,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: palette.text,
  },
  uiDivider: {
    height: 1,
    backgroundColor: palette.outline,
    marginVertical: spacing.md,
  },
  contextSection: {
    marginBottom: spacing.lg,
  },
  contextCard: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.outline,
    overflow: 'hidden',
  },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.outline,
  },
  contextRowLast: {
    borderBottomWidth: 0,
  },
  contextKey: {
    ...typography.bodyBold,
    color: palette.text,
    flex: 0.4,
  },
  contextValue: {
    ...typography.body,
    color: palette.muted,
    flex: 0.6,
    textAlign: 'right',
  },
  completeCard: {
    backgroundColor: palette.success + '15',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.success + '30',
  },
  completeText: {
    ...typography.bodyBold,
    color: palette.success,
  },
  actionsContainer: {
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  actionButtonContainer: {
    marginBottom: spacing.xs,
  },
  // Form styles
  formContainer: {
    marginBottom: spacing.md,
  },
  formFieldsContainer: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.outline,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  formFieldContainer: {
    marginBottom: spacing.md,
  },
  formFieldLabel: {
    ...typography.bodyBold,
    color: palette.text,
    marginBottom: spacing.xs,
  },
  requiredStar: {
    color: palette.danger,
  },
  formFieldDescription: {
    ...typography.caption,
    color: palette.muted,
    marginBottom: spacing.xs,
  },
  formFieldInput: {
    backgroundColor: palette.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.outline,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: palette.text,
  },
  menuButton: {
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  menuButtonPressed: {
    opacity: 0.7,
    backgroundColor: palette.surfaceSecondary,
  },
})

export default ESSIWorkflowDetails
