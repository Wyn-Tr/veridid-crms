import { useEffect, useMemo, useState } from 'react'
import { BrandingOverlay } from '@bifold/oca'

type AttributeLike = {
  name?: string
  value?: unknown
}

type SvgBindings = Record<string, string>

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const toStringValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const buildAttributeMap = (attributes?: AttributeLike[]): Record<string, string> => {
  const map: Record<string, string> = {}
  if (!attributes) return map
  for (const attr of attributes) {
    const name = attr?.name
    if (!name) continue
    map[name] = toStringValue(attr.value)
  }
  return map
}

const applySvgBindings = (
  svg: string,
  bindings: SvgBindings,
  attributes: Record<string, string>,
  meta?: { issuer?: string; name?: string; description?: string }
): string => {
  const metaMap: Record<string, string> = {
    issuer: meta?.issuer ?? '',
    name: meta?.name ?? '',
    description: meta?.description ?? '',
  }

  return svg.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, key: string) => {
    const normalized = key.trim()
    const target = bindings[normalized] || normalized
    const value = attributes[target] ?? metaMap[target] ?? ''
    return escapeXml(toStringValue(value))
  })
}

export const useSvgTemplate = (
  brandingOverlay?: BrandingOverlay,
  attributes?: AttributeLike[],
  meta?: { issuer?: string; name?: string; description?: string }
): { svgXml: string | null; isLoading: boolean } => {
  const [svgXml, setSvgXml] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const svgTemplateUrl =
    (brandingOverlay as any)?.svgTemplateUrl ||
    (brandingOverlay as any)?.svg_template_url ||
    undefined

  const svgBindings: SvgBindings =
    (brandingOverlay as any)?.svgBindings ||
    (brandingOverlay as any)?.svg_bindings ||
    {}

  const attributesKey = useMemo(
    () =>
      (attributes || [])
        .map((attr) => `${attr?.name ?? ''}:${toStringValue(attr?.value)}`)
        .join('|'),
    [attributes]
  )

  useEffect(() => {
    if (!svgTemplateUrl) {
      setSvgXml(null)
      return
    }

    let cancelled = false
    setIsLoading(true)

    fetch(svgTemplateUrl)
      .then((res) => res.text())
      .then((svg) => {
        if (cancelled) return
        const attrMap = buildAttributeMap(attributes)
        const rendered = applySvgBindings(svg, svgBindings, attrMap, meta)
        setSvgXml(rendered)
      })
      .catch(() => {
        if (!cancelled) setSvgXml(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [svgTemplateUrl, attributesKey, JSON.stringify(svgBindings), meta?.issuer, meta?.name, meta?.description])

  return { svgXml, isLoading }
}

