import { Agent } from '@credo-ts/core'
import { Buffer } from 'buffer'
import { sha256 } from 'react-native-sha256'

export interface AadharKYCContent {
  xmlDataBase64: string
  fileName: string
  extractedAt: number
  sha256Hash: string
  fileSize: number
  zipHash: string
}

export interface AadharKYCTags {
  documentType: string
  fileName: string
  imported: string
}

// Service class for Aadhar KYC storage operations
export class AadharKYCStorageService {
  private agent: Agent

  constructor(agent: Agent) {
    this.agent = agent
  }

  /**
   * Store XML data in Askar using genericRecords
   * CRITICAL: Stores base64-encoded XML to preserve exact bytes for signature verification
   */
  async storeKYCDocument(data: {
    xmlDataBase64: string
    fileName: string
    sha256Hash: string
    fileSize: number
    zipHash: string
  }): Promise<string> {
    const now = Date.now()

    const content: AadharKYCContent = {
      xmlDataBase64: data.xmlDataBase64,
      fileName: data.fileName,
      extractedAt: now,
      sha256Hash: data.sha256Hash,
      fileSize: data.fileSize,
      zipHash: data.zipHash,
    }

    const tags: AadharKYCTags = {
      documentType: 'aadhar-kyc',
      fileName: data.fileName,
      imported: new Date(now).toISOString(),
    }

    const record = await this.agent.genericRecords.save({
      content: content as unknown as Record<string, unknown>,
      tags: tags as any,
    })

    return record.id
  }

  /**
   * Retrieve XML data and verify integrity
   */
  async getKYCDocument(id: string): Promise<{
    xmlContent: string
    metadata: {
      fileName: string
      extractedAt: number
      fileSize: number
      verified: boolean
    }
  }> {
    const record = await this.agent.genericRecords.findById(id)

    if (!record) {
      throw new Error('KYC document not found')
    }

    const content = record.content as unknown as AadharKYCContent

    // Decode base64 back to XML
    const xmlContent = Buffer.from(content.xmlDataBase64, 'base64').toString('utf-8')

    // Verify integrity
    const currentHash = await sha256(content.xmlDataBase64)
    const verified = currentHash === content.sha256Hash

    if (!verified) {
      throw new Error('XML integrity check failed - data may be corrupted')
    }

    return {
      xmlContent,
      metadata: {
        fileName: content.fileName,
        extractedAt: content.extractedAt,
        fileSize: content.fileSize,
        verified,
      },
    }
  }

  /**
   * Get all stored KYC documents
   */
  async getAllKYCDocuments(): Promise<Array<{ id: string; content: AadharKYCContent; tags: AadharKYCTags }>> {
    const records = await this.agent.genericRecords.findAllByQuery({
      documentType: 'aadhar-kyc',
    })

    return records.map((record) => ({
      id: record.id,
      content: record.content as unknown as AadharKYCContent,
      tags: (record as any).tags as AadharKYCTags,
    }))
  }

  /**
   * Delete KYC document
   */
  async deleteKYCDocument(id: string): Promise<void> {
    const record = await this.agent.genericRecords.findById(id)
    if (!record) {
      throw new Error('KYC document not found')
    }
    await this.agent.genericRecords.delete(record)
  }

  /**
   * Get raw XML content (for signature verification)
   */
  async getRawXMLContent(id: string): Promise<string> {
    const record = await this.agent.genericRecords.findById(id)

    if (!record) {
      throw new Error('KYC document not found')
    }

    const content = record.content as unknown as AadharKYCContent

    // Verify integrity first
    const currentHash = await sha256(content.xmlDataBase64)
    if (currentHash !== content.sha256Hash) {
      throw new Error('XML integrity check failed')
    }

    // Return exact XML content
    return Buffer.from(content.xmlDataBase64, 'base64').toString('utf-8')
  }
}
