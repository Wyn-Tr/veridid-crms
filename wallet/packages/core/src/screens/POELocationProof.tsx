import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform, PermissionsAndroid, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StackScreenProps } from '@react-navigation/stack'
import FeatherIcon from 'react-native-vector-icons/Feather'
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons'
import Geolocation from '@react-native-community/geolocation'

import { DispatchAction } from '../contexts/reducers/store'
import { useStore } from '../contexts/store'
import { testIdWithKey } from '../utils/testable'
import Button, { ButtonType } from '../components/buttons/Button'
import { Screens, SettingStackParams } from '../types/navigators'
import { palette, spacing, radius } from '../theme/essi'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const HORIZONTAL_PADDING = 20 // spacing.lg
const CARD_GAP = 5
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2

type POELocationProofProps = StackScreenProps<SettingStackParams, Screens.POELocationProof>

interface SensorData {
  latitude: number | null
  longitude: number | null
  altitude: number | null
  accuracy: number | null
  speed: number | null
  heading: number | null
  magnetometerX: number | null
  magnetometerY: number | null
  magnetometerZ: number | null
  pressure: number | null
  timestamp: number | null
  address: string | null
  cellId: string | null
}

interface LocationProofResult {
  latitude: number
  longitude: number
  confidenceScore: number
  isValid: boolean
  magneticValid: boolean
  altitudeValid: boolean
  gpsAccuracyOk: boolean
  timestampFresh: boolean
  timestamp: number
}

const POELocationProof: React.FC<POELocationProofProps> = () => {
  const [store, dispatch] = useStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [proofResult, setProofResult] = useState<LocationProofResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sensorData, setSensorData] = useState<SensorData>({
    latitude: null,
    longitude: null,
    altitude: null,
    accuracy: null,
    speed: null,
    heading: null,
    magnetometerX: null,
    magnetometerY: null,
    magnetometerZ: null,
    pressure: null,
    timestamp: null,
    address: null,
    cellId: null,
  })

  // Auto-fetch location on mount
  useEffect(() => {
    initializeLocation()
  }, [])

  const initializeLocation = async () => {
    const granted = await checkPermission()
    if (granted) {
      collectSensorData()
    } else {
      setIsLoading(false)
    }
  }

  const checkPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      )
      setHasPermission(granted)
      return granted
    }
    setHasPermission(true)
    return true
  }

  const requestPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Location access is needed for proof generation',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      )
      const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED
      setHasPermission(isGranted)
      if (isGranted) {
        collectSensorData()
      }
    }
  }

  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { 'User-Agent': 'POEProofsApp/1.0' } }
      )
      const data = await response.json()
      if (data.address) {
        const parts = []
        if (data.address.road) parts.push(data.address.road)
        if (data.address.city || data.address.town || data.address.village) {
          parts.push(data.address.city || data.address.town || data.address.village)
        }
        if (data.address.country) parts.push(data.address.country)
        return parts.join(', ') || 'Unknown location'
      }
      return 'Unknown location'
    } catch {
      return 'Unable to fetch address'
    }
  }

  const collectSensorData = useCallback(() => {
    setIsLoading(true)
    setError(null)

    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, altitude, accuracy, speed, heading } = position.coords

        // Get address via reverse geocoding
        const address = await reverseGeocode(latitude, longitude)

        // Simulated cell tower ID (would need telephony API for real data)
        const cellId = `MCC:404 MNC:10 LAC:${Math.floor(10000 + Math.random() * 90000)} CID:${Math.floor(100000 + Math.random() * 900000)}`

        // Magnetometer data
        const mockMagX = 22.5 + (Math.random() - 0.5) * 10
        const mockMagY = 5.2 + (Math.random() - 0.5) * 5
        const mockMagZ = 42.1 + (Math.random() - 0.5) * 10

        // Pressure data
        const mockPressure = 101325 + (Math.random() - 0.5) * 2000

        setSensorData({
          latitude,
          longitude,
          altitude: altitude ?? 0,
          accuracy: accuracy ?? 10,
          speed: speed ?? 0,
          heading: heading ?? 0,
          magnetometerX: mockMagX,
          magnetometerY: mockMagY,
          magnetometerZ: mockMagZ,
          pressure: mockPressure,
          timestamp: position.timestamp,
          address,
          cellId,
        })
        setIsLoading(false)
      },
      (geoError) => {
        setError(geoError.message)
        setIsLoading(false)
        if (geoError.code === 1) {
          setHasPermission(false)
        }
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
    )
  }, [])

  const generateProof = async () => {
    if (!sensorData.latitude || !sensorData.longitude) return

    setIsGenerating(true)
    setError(null)
    setProofResult(null)

    try {
      const poeProofs = await import('@ajna-inc/poe-proofs')

      const result = await poeProofs.generateLocationProofPOE({
        nonce: Date.now(),
        contextHash: Math.floor(Math.random() * 1000000),
        sessionId: Math.floor(Math.random() * 1000000),
        latitude: sensorData.latitude,
        longitude: sensorData.longitude,
        altitudeM: sensorData.altitude || 0,
        gpsAccuracyM: sensorData.accuracy || 10,
        magXUt: sensorData.magnetometerX || 0,
        magYUt: sensorData.magnetometerY || 0,
        magZUt: sensorData.magnetometerZ || 0,
        pressurePa: sensorData.pressure || 101325,
        proofTimestamp: Math.floor(Date.now() / 1000),
        currentTimestamp: Math.floor(Date.now() / 1000),
        magneticTolerancePercent: 30,
        altitudeToleranceM: 50,
      })

      const proofData: LocationProofResult = {
        latitude: sensorData.latitude,
        longitude: sensorData.longitude,
        confidenceScore: result.confidenceScore,
        isValid: result.isValid,
        magneticValid: result.magneticValid,
        altitudeValid: result.altitudeValid,
        gpsAccuracyOk: result.gpsAccuracyOk,
        timestampFresh: result.timestampFresh,
        timestamp: Math.floor(Date.now() / 1000),
      }

      setProofResult(proofData)

      dispatch({
        type: DispatchAction.POE_UPDATE_LAST_LOCATION_PROOF,
        payload: [{
          timestamp: proofData.timestamp,
          latitude: proofData.latitude,
          longitude: proofData.longitude,
          confidenceScore: proofData.confidenceScore,
          isValid: proofData.isValid,
        }],
      })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const formatCoordinate = (coord: number | null, decimals = 6): string => {
    if (coord === null) return '--'
    return coord.toFixed(decimals)
  }

  const ValidationBadge: React.FC<{ isValid: boolean; label: string }> = ({ isValid, label }) => (
    <View style={[styles.badge, isValid ? styles.badgeSuccess : styles.badgeError]}>
      <View style={styles.badgeIcon}>
        <FeatherIcon
          name={isValid ? 'check' : 'x'}
          size={12}
          color={isValid ? palette.success : palette.danger}
        />
      </View>
      <Text style={[styles.badgeText, isValid ? styles.badgeTextSuccess : styles.badgeTextError]}>
        {label}
      </Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header with icon */}
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <FeatherIcon name="map-pin" size={28} color={palette.primary} />
          </View>
          <Text style={styles.headerTitle}>Location Proof</Text>
          <Text style={styles.headerSubtitle}>
            Verify your location with zero-knowledge cryptography
          </Text>
        </View>

        {/* Permission request */}
        {hasPermission === false && (
          <View style={styles.permissionCard}>
            <View style={styles.permissionIcon}>
              <FeatherIcon name="alert-circle" size={24} color={palette.warning} />
            </View>
            <Text style={styles.permissionText}>
              Location permission required
            </Text>
            <Button
              title="Grant Permission"
              accessibilityLabel="Grant Permission"
              testID={testIdWithKey('GrantPermission')}
              onPress={requestPermission}
              buttonType={ButtonType.Secondary}
            />
          </View>
        )}

        {/* Loading state */}
        {isLoading && hasPermission !== false && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={palette.primary} />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        )}

        {/* Location data grid */}
        {!isLoading && sensorData.latitude && (
          <>
            {/* Address card - full width */}
            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <View style={styles.addressIcon}>
                  <FeatherIcon name="map" size={18} color={palette.primary} />
                </View>
                <Text style={styles.addressLabel}>Current Location</Text>
              </View>
              <Text style={styles.addressText}>{sensorData.address || 'Fetching address...'}</Text>
              <Text style={styles.coordinatesText}>
                {formatCoordinate(sensorData.latitude)}, {formatCoordinate(sensorData.longitude)}
              </Text>
            </View>

            {/* GPS Data Grid - Row 1 */}
            <View style={{ flexDirection: 'row', width: SCREEN_WIDTH - HORIZONTAL_PADDING * 2, marginBottom: CARD_GAP }}>
              <View style={{ width: CARD_WIDTH, backgroundColor: palette.card, borderRadius: 24, padding: 16, marginRight: CARD_GAP }}>
                <View style={[styles.cardIconContainer, { backgroundColor: `${palette.primary}20` }]}>
                  <FeatherIcon name="navigation" size={20} color={palette.primary} />
                </View>
                <Text style={styles.cardLabel}>Latitude</Text>
                <Text style={styles.cardValue}>{formatCoordinate(sensorData.latitude, 4)}</Text>
                <Text style={styles.cardSubValue}>{sensorData.latitude && sensorData.latitude >= 0 ? 'North' : 'South'}</Text>
              </View>
              <View style={{ width: CARD_WIDTH, backgroundColor: palette.card, borderRadius: 24, padding: 16 }}>
                <View style={[styles.cardIconContainer, { backgroundColor: `${palette.primary}20` }]}>
                  <FeatherIcon name="navigation" size={20} color={palette.primary} />
                </View>
                <Text style={styles.cardLabel}>Longitude</Text>
                <Text style={styles.cardValue}>{formatCoordinate(sensorData.longitude, 4)}</Text>
                <Text style={styles.cardSubValue}>{sensorData.longitude && sensorData.longitude >= 0 ? 'East' : 'West'}</Text>
              </View>
            </View>
            {/* GPS Data Grid - Row 2 */}
            <View style={{ flexDirection: 'row', width: SCREEN_WIDTH - HORIZONTAL_PADDING * 2, marginBottom: CARD_GAP }}>
              <View style={{ width: CARD_WIDTH, backgroundColor: palette.card, borderRadius: 24, padding: 16, marginRight: CARD_GAP }}>
                <View style={[styles.cardIconContainer, { backgroundColor: '#4CAF5020' }]}>
                  <FeatherIcon name="trending-up" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.cardLabel}>Altitude</Text>
                <Text style={styles.cardValue}>{sensorData.altitude?.toFixed(1) || '0'} m</Text>
                <Text style={styles.cardSubValue}>Above sea level</Text>
              </View>
              <View style={{ width: CARD_WIDTH, backgroundColor: palette.card, borderRadius: 24, padding: 16 }}>
                <View style={[styles.cardIconContainer, { backgroundColor: '#FF980020' }]}>
                  <FeatherIcon name="target" size={20} color="#FF9800" />
                </View>
                <Text style={styles.cardLabel}>GPS Accuracy</Text>
                <Text style={styles.cardValue}>± {sensorData.accuracy?.toFixed(1) || '0'} m</Text>
                <Text style={styles.cardSubValue}>{sensorData.accuracy && sensorData.accuracy < 10 ? 'High precision' : 'Moderate'}</Text>
              </View>
            </View>

            {/* Cell Tower Info */}
            <View style={styles.cellCard}>
              <View style={styles.cellHeader}>
                <View style={styles.cellIcon}>
                  <MaterialIcon name="cellphone-wireless" size={20} color={palette.muted} />
                </View>
                <Text style={styles.cellLabel}>Cell Tower ID</Text>
              </View>
              <Text style={styles.cellValue}>{sensorData.cellId || '--'}</Text>
            </View>

            {/* Additional Sensors */}
            <View style={styles.sensorSection}>
              <Text style={styles.sectionTitle}>Environmental Sensors</Text>
              <View style={{ flexDirection: 'row', width: SCREEN_WIDTH - HORIZONTAL_PADDING * 2 }}>
                <View style={{ width: CARD_WIDTH, backgroundColor: palette.surfaceSecondary, borderRadius: 16, padding: 16, alignItems: 'center', marginRight: CARD_GAP }}>
                  <MaterialIcon name="compass" size={18} color={palette.muted} />
                  <Text style={styles.sensorLabel}>Magnetometer</Text>
                  <Text style={styles.sensorValue}>
                    {sensorData.magnetometerX?.toFixed(1) || '--'} µT
                  </Text>
                </View>
                <View style={{ width: CARD_WIDTH, backgroundColor: palette.surfaceSecondary, borderRadius: 16, padding: 16, alignItems: 'center' }}>
                  <MaterialIcon name="gauge" size={18} color={palette.muted} />
                  <Text style={styles.sensorLabel}>Pressure</Text>
                  <Text style={styles.sensorValue}>
                    {sensorData.pressure ? (sensorData.pressure / 100).toFixed(1) : '--'} hPa
                  </Text>
                </View>
              </View>
            </View>

            {/* Refresh button */}
            <View style={styles.refreshContainer}>
              <Button
                title="Refresh Location"
                accessibilityLabel="Refresh Location"
                testID={testIdWithKey('RefreshLocation')}
                onPress={collectSensorData}
                buttonType={ButtonType.Secondary}
              />
            </View>

            {/* Generate Proof button */}
            <View style={styles.buttonContainer}>
              <Button
                title={isGenerating ? 'Generating Proof...' : 'Generate Location Proof'}
                accessibilityLabel="Generate Location Proof"
                testID={testIdWithKey('GenerateLocationProof')}
                onPress={generateProof}
                buttonType={ButtonType.Primary}
                disabled={isGenerating}
              />
            </View>

            {/* Generating indicator */}
            {isGenerating && (
              <View style={styles.generatingCard}>
                <ActivityIndicator size="small" color={palette.primary} />
                <Text style={styles.generatingText}>Creating zero-knowledge proof...</Text>
              </View>
            )}

            {/* Proof Result */}
            {proofResult && (
              <View style={[styles.resultCard, proofResult.isValid ? styles.resultSuccess : styles.resultError]}>
                <View style={styles.resultHeader}>
                  <View style={[styles.resultIconContainer, proofResult.isValid ? styles.resultIconSuccess : styles.resultIconError]}>
                    <FeatherIcon
                      name={proofResult.isValid ? 'check' : 'x'}
                      size={24}
                      color={proofResult.isValid ? palette.success : palette.danger}
                    />
                  </View>
                  <View style={styles.resultHeaderText}>
                    <Text style={styles.resultTitle}>
                      {proofResult.isValid ? 'Proof Generated' : 'Proof Failed'}
                    </Text>
                    <Text style={styles.resultConfidence}>
                      {proofResult.confidenceScore}% confidence
                    </Text>
                  </View>
                </View>

                <View style={styles.badgeContainer}>
                  <ValidationBadge isValid={proofResult.gpsAccuracyOk} label="GPS" />
                  <ValidationBadge isValid={proofResult.magneticValid} label="Magnetic" />
                  <ValidationBadge isValid={proofResult.altitudeValid} label="Altitude" />
                  <ValidationBadge isValid={proofResult.timestampFresh} label="Fresh" />
                </View>
              </View>
            )}

            {/* Error display */}
            {error && !proofResult && (
              <View style={styles.errorCard}>
                <View style={styles.errorIcon}>
                  <FeatherIcon name="alert-triangle" size={20} color={palette.danger} />
                </View>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${palette.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.text,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: palette.muted,
    textAlign: 'center',
  },
  permissionCard: {
    backgroundColor: 'rgba(255, 181, 71, 0.1)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  permissionIcon: {
    marginBottom: spacing.md,
  },
  permissionText: {
    fontSize: 14,
    color: palette.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  loadingCard: {
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: palette.muted,
    marginTop: spacing.md,
  },
  addressCard: {
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addressIcon: {
    marginRight: spacing.sm,
  },
  addressLabel: {
    fontSize: 12,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    marginBottom: spacing.xs,
  },
  coordinatesText: {
    fontSize: 12,
    color: palette.muted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: CARD_GAP,
    marginHorizontal: -CARD_GAP / 2,
  },
  dataCard: {
    flex: 1,
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: CARD_GAP / 2,
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardLabel: {
    fontSize: 11,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  cardSubValue: {
    fontSize: 11,
    color: palette.muted,
    marginTop: 2,
  },
  cellCard: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cellIcon: {
    marginRight: spacing.sm,
  },
  cellLabel: {
    fontSize: 12,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cellValue: {
    fontSize: 12,
    color: palette.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  sensorSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  sensorRow: {
    flexDirection: 'row',
    marginHorizontal: -CARD_GAP / 2,
  },
  sensorItem: {
    flex: 1,
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginHorizontal: CARD_GAP / 2,
  },
  sensorLabel: {
    fontSize: 11,
    color: palette.muted,
    marginTop: spacing.xs,
  },
  sensorValue: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
    marginTop: spacing.xs,
  },
  refreshContainer: {
    marginBottom: spacing.sm,
  },
  buttonContainer: {
    marginBottom: spacing.md,
  },
  generatingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  generatingText: {
    fontSize: 14,
    color: palette.muted,
    marginLeft: spacing.sm,
  },
  resultCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: 'rgba(76, 217, 100, 0.1)',
    borderColor: palette.success,
  },
  resultError: {
    backgroundColor: 'rgba(255, 77, 79, 0.1)',
    borderColor: palette.danger,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  resultIconContainer: {
    width: 48,
    marginRight: spacing.md,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultIconSuccess: {
    backgroundColor: 'rgba(76, 217, 100, 0.2)',
  },
  resultIconError: {
    backgroundColor: 'rgba(255, 77, 79, 0.2)',
  },
  resultHeaderText: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  resultConfidence: {
    fontSize: 14,
    color: palette.muted,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(76, 217, 100, 0.2)',
  },
  badgeError: {
    backgroundColor: 'rgba(255, 77, 79, 0.2)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  badgeTextSuccess: {
    color: palette.success,
  },
  badgeTextError: {
    color: palette.danger,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 77, 79, 0.1)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorIcon: {
    marginRight: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: palette.danger,
  },
})

export default POELocationProof
