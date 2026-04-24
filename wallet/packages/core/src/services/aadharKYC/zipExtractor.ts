import RNFS from 'react-native-fs'
import { unzipWithPassword } from 'react-native-zip-archive'
import { sha256 } from 'react-native-sha256'
import { Buffer } from 'buffer'

export interface ZipExtractionResult {
  xmlContent: string // Raw XML as string
  xmlBase64: string // Base64-encoded XML
  fileName: string // Original filename
  sha256Hash: string // Hash of XML content
  fileSize: number // Size in bytes
  zipHash: string // Hash of zip file
}

export class AadharZipExtractor {
  /**
   * Extract XML from password-protected Aadhar KYC zip file
   * CRITICAL: Must preserve exact XML content for signature validation
   */
  static async extractXMLFromZip(zipFilePath: string, password: string): Promise<ZipExtractionResult> {
    const tempDir = `${RNFS.TemporaryDirectoryPath}/aadhar_temp_${Date.now()}`

    try {
      // Create temp directory
      await RNFS.mkdir(tempDir)

      // Calculate zip hash for audit trail
      const zipHash = await sha256(await RNFS.readFile(zipFilePath, 'base64'))

      // Extract zip with password
      await unzipWithPassword(zipFilePath, tempDir, password)

      // Find XML file (usually named like offline_xml_*.xml)
      const files = await RNFS.readDir(tempDir)
      const xmlFile = files.find((f) => f.name.endsWith('.xml'))

      if (!xmlFile) {
        throw new Error('No XML file found in zip archive')
      }

      // Read XML content as base64 to preserve exact bytes
      const xmlBase64 = await RNFS.readFile(xmlFile.path, 'base64')

      // Calculate hash of XML for integrity verification
      const xmlHash = await sha256(xmlBase64)

      // Decode to string for validation (but store base64)
      const xmlContent = Buffer.from(xmlBase64, 'base64').toString('utf-8')

      // Validate it's actual XML
      if (!xmlContent.trim().startsWith('<?xml')) {
        throw new Error('Invalid XML format')
      }

      return {
        xmlContent,
        xmlBase64,
        fileName: xmlFile.name,
        sha256Hash: xmlHash,
        fileSize: xmlFile.size,
        zipHash,
      }
    } finally {
      // Clean up temp directory
      await RNFS.unlink(tempDir).catch(() => {})
    }
  }

  /**
   * Verify password without full extraction
   */
  static async verifyPassword(zipFilePath: string, password: string): Promise<boolean> {
    const tempDir = `${RNFS.TemporaryDirectoryPath}/aadhar_verify_${Date.now()}`
    try {
      await RNFS.mkdir(tempDir)
      await unzipWithPassword(zipFilePath, tempDir, password)
      return true
    } catch (error) {
      return false
    } finally {
      await RNFS.unlink(tempDir).catch(() => {})
    }
  }
}
