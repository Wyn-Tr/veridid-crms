import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { useAgent } from '@credo-ts/react-hooks'
import type { WorkflowInstanceRecord, WorkflowTemplateRecord } from '@ajna-inc/workflow'
import { MobileWorkflowService } from '../services/WorkflowService'
import { useWorkflowEvents } from './useWorkflowEvents'
import { useStore } from '../contexts/store'

/**
 * Hook to list and manage workflow instances
 */
export function useWorkflows(connectionId?: string) {
  const { agent } = useAgent()
  const [store] = useStore()
  const [instances, setInstances] = useState<WorkflowInstanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const appState = useRef(AppState.currentState)

  const service = useMemo(() => {
    if (!agent) return null
    return new MobileWorkflowService(agent)
  }, [agent])

  const refresh = useCallback(async () => {
    if (!service) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const list = await service.listInstances(connectionId)
      setInstances(list)
    } catch (e) {
      setError(e as Error)
      setInstances([])
    } finally {
      setLoading(false)
    }
  }, [service, connectionId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Auto-refresh when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        refresh()
      }
      appState.current = nextAppState
    })

    return () => {
      subscription.remove()
    }
  }, [refresh])

  // Auto-refresh when user authenticates (unlocks wallet)
  useEffect(() => {
    if (store.authentication.didAuthenticate) {
      refresh()
    }
  }, [store.authentication.didAuthenticate, refresh])

  // Auto-refresh when workflow events occur
  useWorkflowEvents({
    onCreated: () => refresh(),
    onStateChanged: () => refresh(),
    onStatusChanged: () => refresh(),
    onCompleted: () => refresh(),
  })

  const start = useCallback(
    async (params: {
      templateId: string
      templateVersion?: string
      connectionId: string
      participants?: Record<string, unknown>
      context?: Record<string, unknown>
    }) => {
      if (!service) throw new Error('Workflow service not available')

      const instance = await service.start(params)
      await refresh()
      return instance
    },
    [service, refresh]
  )

  return {
    instances,
    loading,
    error,
    refresh,
    start,
    isAvailable: service?.isAvailable ?? false,
  }
}

/**
 * Hook to list and manage workflow templates
 */
export function useWorkflowTemplates() {
  const { agent } = useAgent()
  const [templates, setTemplates] = useState<WorkflowTemplateRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const service = useMemo(() => {
    if (!agent) return null
    return new MobileWorkflowService(agent)
  }, [agent])

  const refresh = useCallback(async () => {
    if (!service) return

    setLoading(true)
    setError(null)

    try {
      const list = await service.listTemplates()
      setTemplates(list)
    } catch (e) {
      setError(e as Error)
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [service])

  useEffect(() => {
    refresh()
  }, [refresh])

  const discoverTemplates = useCallback(
    async (connectionId: string, options?: { templateId?: string; templateVersion?: string }) => {
      if (!service) throw new Error('Workflow service not available')

      const discovered = await service.discoverTemplates(connectionId, options)
      await refresh()
      return discovered
    },
    [service, refresh]
  )

  const getTemplate = useCallback(
    async (templateId: string, version?: string) => {
      if (!service) throw new Error('Workflow service not available')
      return service.getTemplate(templateId, version)
    },
    [service]
  )

  const ensureTemplate = useCallback(
    async (connectionId: string, templateId: string, version?: string) => {
      if (!service) throw new Error('Workflow service not available')
      return service.ensureTemplate(connectionId, templateId, version)
    },
    [service]
  )

  return {
    templates,
    loading,
    error,
    refresh,
    discoverTemplates,
    getTemplate,
    ensureTemplate,
    isAvailable: service?.isAvailable ?? false,
  }
}

/**
 * Hook to get workflows that need user attention
 */
export function usePendingWorkflows() {
  const { agent } = useAgent()
  const [store] = useStore()
  const [pendingWorkflows, setPendingWorkflows] = useState<WorkflowInstanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const appState = useRef(AppState.currentState)

  const service = useMemo(() => {
    if (!agent) return null
    return new MobileWorkflowService(agent)
  }, [agent])

  const refresh = useCallback(async () => {
    if (!service) return

    setLoading(true)

    try {
      const pending = await service.getPendingWorkflows()
      setPendingWorkflows(pending)
    } catch {
      setPendingWorkflows([])
    } finally {
      setLoading(false)
    }
  }, [service])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Auto-refresh when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        refresh()
      }
      appState.current = nextAppState
    })

    return () => {
      subscription.remove()
    }
  }, [refresh])

  // Auto-refresh when user authenticates (unlocks wallet)
  useEffect(() => {
    if (store.authentication.didAuthenticate) {
      refresh()
    }
  }, [store.authentication.didAuthenticate, refresh])

  // Auto-refresh when workflow events occur
  useWorkflowEvents({
    onCreated: () => refresh(),
    onStateChanged: () => refresh(),
    onStatusChanged: () => refresh(),
    onCompleted: () => refresh(),
  })

  return {
    pendingWorkflows,
    loading,
    refresh,
    count: pendingWorkflows.length,
  }
}
