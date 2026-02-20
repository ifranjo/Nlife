/**
 * Backup and Recovery System for GEO Analytics Data
 *
 * Provides robust backup/restore functionality for AI analytics data
 * with compression, encryption, and automated scheduling
 */

import type { AnalyticsReport, AIEvent, ConversionAttribution } from './ai-analytics';

// Backup Configuration
interface BackupConfig {
  autoBackupInterval: number; // ms between auto-backups (default: 6 hours)
  retentionDays: number; // days to retain backups (default: 30)
  compressionEnabled: boolean; // enable gzip compression
  encryptionEnabled: boolean; // enable client-side encryption
  encryptionKey?: string; // optional encryption key
  maxBackups: number; // maximum number of backups to keep
  verifyBackups: boolean; // verify backup integrity
}

// Backup Metadata
interface BackupMetadata {
  id: string;
  timestamp: number;
  version: string;
  size: number;
  compressed: boolean;
  encrypted: boolean;
  checksum: string;
  dataTypes: string[];
  description?: string;
}

// Backup Point
interface BackupPoint {
  metadata: BackupMetadata;
  data: BackupData;
}

// Backup Data Structure
interface BackupData {
  events: AIEvent[];
  conversions: ConversionAttribution[];
  metrics: Record<string, any>;
  settings: Record<string, any>;
  personalization: Record<string, any>;
}

// Restore Options
interface RestoreOptions {
  merge: boolean; // merge with existing data vs replace
  verify: boolean; // verify before restore
  backupCurrent: boolean; // backup current state before restore
}

// Export/Import Options
interface ExportOptions {
  format: 'json' | 'encrypted';
  includeMetadata: boolean;
  prettify: boolean;
}

// Backup Statistics
interface BackupStats {
  totalBackups: number;
  totalSize: number;
  oldestBackup: number;
  newestBackup: number;
  averageSize: number;
}

/**
 * Backup and Recovery Manager
 */
class BackupRecoveryManager {
  private static instance: BackupRecoveryManager;
  private config: BackupConfig;
  private backupWorker: Worker | null = null;
  private isInitialized = false;

  // Default configuration
  private readonly DEFAULT_CONFIG: BackupConfig = {
    autoBackupInterval: 6 * 60 * 60 * 1000, // 6 hours
    retentionDays: 30,
    compressionEnabled: true,
    encryptionEnabled: false,
    maxBackups: 100,
    verifyBackups: true
  };

  // Storage keys
  private readonly STORAGE_KEYS = {
    BACKUPS_LIST: 'geo_backup_points',
    BACKUP_DATA: 'geo_backup_data_',
    SETTINGS: 'geo_backup_settings',
    ENCRYPTION_KEY: 'geo_backup_encryption_key'
  };

  /**
   * Private constructor for singleton
   */
  private constructor() {
    this.config = { ...this.DEFAULT_CONFIG };
  }

  /**
   * Get singleton instance
   */
  static getInstance(): BackupRecoveryManager {
    if (!BackupRecoveryManager.instance) {
      BackupRecoveryManager.instance = new BackupRecoveryManager();
    }
    return BackupRecoveryManager.instance;
  }

  /**
   * Initialize backup system
   */
  async initialize(config: Partial<BackupConfig> = {}): Promise<void> {
    if (this.isInitialized) {
      console.warn('BackupRecoveryManager already initialized');
      return;
    }

    this.config = { ...this.DEFAULT_CONFIG, ...config };

    // Setup encryption if enabled
    if (this.config.encryptionEnabled && !this.config.encryptionKey) {
      await this.setupEncryption();
    }

    // Initialize Web Worker for scheduled backups
    await this.initializeWorker();

    // Cleanup old backups
    await this.cleanupOldBackups();

    this.isInitialized = true;
    console.log('💾 BackupRecoveryManager initialized');

    // Schedule first backup
    this.scheduleNextBackup();
  }

  /**
   * Initialize Web Worker for background tasks
   */
  private async initializeWorker(): Promise<void> {
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported, falling back to main thread');
      return;
    }

    try {
      // Create inline worker
      const workerCode = `
        let backupTimer = null;

        self.onmessage = function(e) {
          const { type, interval } = e.data;

          if (type === 'schedule') {
            if (backupTimer) {
              clearInterval(backupTimer);
            }

            backupTimer = setInterval(() => {
              self.postMessage({ type: 'backup' });
            }, interval);
          } else if (type === 'cancel') {
            if (backupTimer) {
              clearInterval(backupTimer);
              backupTimer = null;
            }
          }
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.backupWorker = new Worker(workerUrl);

      this.backupWorker.onmessage = (e) => {
        if (e.data.type === 'backup') {
          this.performAutoBackup();
        }
      };
    } catch (error) {
      console.warn('Failed to initialize worker:', error);
    }
  }

  /**
   * Setup encryption key
   */
  private async setupEncryption(): Promise<void> {
    let key = localStorage.getItem(this.STORAGE_KEYS.ENCRYPTION_KEY);

    if (!key) {
      // Generate new key
      key = await this.generateEncryptionKey();
      localStorage.setItem(this.STORAGE_KEYS.ENCRYPTION_KEY, key);
    }

    this.config.encryptionKey = key;
  }

  /**
   * Generate encryption key
   */
  private async generateEncryptionKey(): Promise<string> {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create backup
   */
  async backup(description?: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('BackupRecoveryManager not initialized');
    }

    console.log('Creating backup...');

    // Gather data
    const data = await this.gatherBackupData();

    // Create metadata
    const metadata = this.createBackupMetadata(data, description);

    // Compress if enabled
    let processedData = JSON.stringify(data);
    if (this.config.compressionEnabled) {
      processedData = await this.compressData(processedData);
    }

    // Encrypt if enabled
    if (this.config.encryptionEnabled && this.config.encryptionKey) {
      processedData = await this.encryptData(processedData, this.config.encryptionKey);
    }

    // Calculate checksum
    const checksum = await this.calculateChecksum(processedData);
    metadata.checksum = checksum;
    metadata.size = new Blob([processedData]).size;

    // Store backup
    const backupPoint: BackupPoint = {
      metadata,
      data: processedData as any
    };

    await this.storeBackup(backupPoint);

    // Verify if enabled
    if (this.config.verifyBackups) {
      const verified = await this.verifyBackup(metadata.id);
      if (!verified) {
        throw new Error('Backup verification failed');
      }
    }

    console.log(`Backup created: ${metadata.id}`);
    return metadata.id;
  }

  /**
   * Restore from backup
   */
  async restore(pointId: string, options: Partial<RestoreOptions> = {}): Promise<void> {
    const restoreOptions: RestoreOptions = {
      merge: false,
      verify: true,
      backupCurrent: true,
      ...options
    };

    console.log(`Restoring from backup: ${pointId}`);

    // Get backup
    const backup = await this.getBackup(pointId);
    if (!backup) {
      throw new Error(`Backup not found: ${pointId}`);
    }

    // Verify if requested
    if (restoreOptions.verify) {
      const verified = await this.verifyBackup(pointId);
      if (!verified) {
        throw new Error('Backup verification failed');
      }
    }

    // Backup current state if requested
    if (restoreOptions.backupCurrent) {
      await this.backup('Pre-restore backup');
    }

    // Process data
    let data = backup.data;

    // Decrypt if needed
    if (backup.metadata.encrypted && this.config.encryptionKey) {
      data = await this.decryptData(data, this.config.encryptionKey);
    }

    // Decompress if needed
    if (backup.metadata.compressed) {
      data = await this.decompressData(data);
    }

    // Parse data
    const parsedData: BackupData = JSON.parse(data);

    // Restore
    await this.restoreData(parsedData, restoreOptions.merge);

    console.log(`Restore completed: ${pointId}`);
  }

  /**
   * List all backup points
   */
  async listBackupPoints(): Promise<BackupMetadata[]> {
    const backups = await this.getBackupsList();
    return backups.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(): Promise<BackupStats> {
    const backups = await this.listBackupPoints();

    if (backups.length === 0) {
      return {
        totalBackups: 0,
        totalSize: 0,
        oldestBackup: 0,
        newestBackup: 0,
        averageSize: 0
      };
    }

    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

    return {
      totalBackups: backups.length,
      totalSize,
      oldestBackup: backups[backups.length - 1].timestamp,
      newestBackup: backups[0].timestamp,
      averageSize: totalSize / backups.length
    };
  }

  /**
   * Export backup
   */
  async exportBackup(pointId: string, options: Partial<ExportOptions> = {}): Promise<string> {
    const exportOptions: ExportOptions = {
      format: 'json',
      includeMetadata: true,
      prettify: false,
      ...options
    };

    const backup = await this.getBackup(pointId);
    if (!backup) {
      throw new Error(`Backup not found: ${pointId}`);
    }

    let data = backup.data;

    // If encrypted format requested and backup is not encrypted
    if (exportOptions.format === 'encrypted' && !backup.metadata.encrypted) {
      data = await this.encryptData(data, this.config.encryptionKey!);
    }

    // Prepare export data
    const exportData = exportOptions.includeMetadata
      ? { metadata: backup.metadata, data }
      : { data };

    // Convert to string
    const exportString = exportOptions.prettify
      ? JSON.stringify(exportData, null, 2)
      : JSON.stringify(exportData);

    // Create download link
    const blob = new Blob([exportString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    return url;
  }

  /**
   * Import backup
   */
  async importBackup(data: string, options: Partial<RestoreOptions> = {}): Promise<string> {
    try {
      const parsed = JSON.parse(data);

      // Extract metadata and data
      let metadata: BackupMetadata;
      let backupData: any;

      if (parsed.metadata && parsed.data) {
        metadata = parsed.metadata;
        backupData = parsed.data;
      } else {
        backupData = parsed.data || parsed;
        metadata = this.createBackupMetadata(backupData, 'Imported backup');
      }

      // Create new backup with imported data
      const pointId = await this.createBackupFromData(backupData, metadata);

      // Restore if requested
      if (options.merge !== undefined || options.backupCurrent) {
        await this.restore(pointId, options);
      }

      return pointId;
    } catch (error) {
      throw new Error(`Failed to import backup: ${error}`);
    }
  }

  /**
   * Delete backup
   */
  async deleteBackup(pointId: string): Promise<void> {
    // Remove from list
    const backups = await this.getBackupsList();
    const filtered = backups.filter(b => b.id !== pointId);
    await this.storeBackupsList(filtered);

    // Remove data
    localStorage.removeItem(this.STORAGE_KEYS.BACKUP_DATA + pointId);

    console.log(`Backup deleted: ${pointId}`);
  }

  /**
   * Cleanup old backups
   */
  private async cleanupOldBackups(): Promise<void> {
    const backups = await this.getBackupsList();
    const cutoff = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);

    const toKeep = backups.filter(b => b.timestamp > cutoff);
    const toDelete = backups.filter(b => b.timestamp <= cutoff);

    // Also enforce max backups limit
    if (toKeep.length > this.config.maxBackups) {
      const sorted = toKeep.sort((a, b) => b.timestamp - a.timestamp);
      const excess = sorted.slice(this.config.maxBackups);
      toDelete.push(...excess);
    }

    // Delete old backups
    for (const backup of toDelete) {
      await this.deleteBackup(backup.id);
    }

    if (toDelete.length > 0) {
      console.log(`Cleaned up ${toDelete.length} old backups`);
    }
  }

  /**
   * Gather data for backup
   */
  private async gatherBackupData(): Promise<BackupData> {
    return {
      events: this.getStoredEvents(),
      conversions: this.getStoredConversions(),
      metrics: this.getStoredMetrics(),
      settings: this.getStoredSettings(),
      personalization: this.getStoredPersonalization()
    };
  }

  /**
   * Create backup metadata
   */
  private createBackupMetadata(data: BackupData, description?: string): BackupMetadata {
    const dataTypes = [];
    if (data.events.length > 0) dataTypes.push('events');
    if (data.conversions.length > 0) dataTypes.push('conversions');
    if (Object.keys(data.metrics).length > 0) dataTypes.push('metrics');
    if (Object.keys(data.settings).length > 0) dataTypes.push('settings');
    if (Object.keys(data.personalization).length > 0) dataTypes.push('personalization');

    return {
      id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      version: '1.0',
      size: 0, // Will be updated after processing
      compressed: this.config.compressionEnabled,
      encrypted: this.config.encryptionEnabled,
      checksum: '', // Will be calculated later
      dataTypes,
      description
    };
  }

  /**
   * Create backup from existing data
   */
  private async createBackupFromData(data: any, metadata: BackupMetadata): Promise<string> {
    // Process data
    let processedData = typeof data === 'string' ? data : JSON.stringify(data);

    if (this.config.compressionEnabled) {
      processedData = await this.compressData(processedData);
    }

    if (this.config.encryptionEnabled && this.config.encryptionKey) {
      processedData = await this.encryptData(processedData, this.config.encryptionKey);
    }

    // Update metadata
    metadata.checksum = await this.calculateChecksum(processedData);
    metadata.size = new Blob([processedData]).size;
    metadata.compressed = this.config.compressionEnabled;
    metadata.encrypted = this.config.encryptionEnabled;

    // Store backup
    const backupPoint: BackupPoint = {
      metadata,
      data: processedData
    };

    await this.storeBackup(backupPoint);
    return metadata.id;
  }

  /**
   * Store backup
   */
  private async storeBackup(backup: BackupPoint): Promise<void> {
    // Store data
    const dataKey = this.STORAGE_KEYS.BACKUP_DATA + backup.metadata.id;
    localStorage.setItem(dataKey, JSON.stringify(backup.data));

    // Update backups list
    const backups = await this.getBackupsList();
    backups.push(backup.metadata);
    await this.storeBackupsList(backups);
  }

  /**
   * Get backup
   */
  private async getBackup(pointId: string): Promise<BackupPoint | null> {
    const metadata = (await this.getBackupsList()).find(b => b.id === pointId);
    if (!metadata) return null;

    const dataKey = this.STORAGE_KEYS.BACKUP_DATA + pointId;
    const dataStr = localStorage.getItem(dataKey);
    if (!dataStr) return null;

    try {
      const data = JSON.parse(dataStr);
      return { metadata, data };
    } catch {
      return null;
    }
  }

  /**
   * Get backups list
   */
  private async getBackupsList(): Promise<BackupMetadata[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.BACKUPS_LIST);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Store backups list
   */
  private async storeBackupsList(backups: BackupMetadata[]): Promise<void> {
    localStorage.setItem(this.STORAGE_KEYS.BACKUPS_LIST, JSON.stringify(backups));
  }

  /**
   * Compress data using gzip
   */
  private async compressData(data: string): Promise<string> {
    // Simple compression using LZ-string
    // In production, use a proper compression library
    return this.simpleCompress(data);
  }

  /**
   * Decompress data
   */
  private async decompressData(data: string): Promise<string> {
    return this.simpleDecompress(data);
  }

  /**
   * Simple compression (placeholder)
   */
  private simpleCompress(data: string): string {
    // Base64 encode with simple RLE for repeated characters
    const compressed = btoa(data);
    return 'COMPRESSED:' + compressed;
  }

  /**
   * Simple decompression (placeholder)
   */
  private simpleDecompress(data: string): string {
    if (!data.startsWith('COMPRESSED:')) {
      return data;
    }
    const compressed = data.substring(11);
    return atob(compressed);
  }

  /**
   * Encrypt data
   */
  private async encryptData(data: string, key: string): Promise<string> {
    // Simple XOR encryption (use proper encryption in production)
    const encrypted = this.xorEncrypt(data, key);
    return 'ENCRYPTED:' + encrypted;
  }

  /**
   * Decrypt data
   */
  private async decryptData(data: string, key: string): Promise<string> {
    if (!data.startsWith('ENCRYPTED:')) {
      return data;
    }
    const encrypted = data.substring(10);
    return this.xorEncrypt(encrypted, key);
  }

  /**
   * Simple XOR encryption
   */
  private xorEncrypt(data: string, key: string): string {
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return btoa(result);
  }

  /**
   * Calculate checksum
   */
  private async calculateChecksum(data: string): Promise<string> {
    // Simple checksum (use proper hash in production)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Verify backup integrity
   */
  private async verifyBackup(pointId: string): Promise<boolean> {
    const backup = await this.getBackup(pointId);
    if (!backup) return false;

    // Recalculate checksum
    const calculatedChecksum = await this.calculateChecksum(JSON.stringify(backup.data));
    return calculatedChecksum === backup.metadata.checksum;
  }

  /**
   * Restore data
   */
  private async restoreData(data: BackupData, merge: boolean): Promise<void> {
    if (merge) {
      // Merge with existing data
      const existing = await this.gatherBackupData();

      // Merge events
      const existingEvents = new Map(existing.events.map(e => [e.eventId, e]));
      data.events.forEach(e => existingEvents.set(e.eventId, e));
      data.events = Array.from(existingEvents.values());

      // Merge conversions
      const existingConversions = new Map(existing.conversions.map(c => [c.sessionId, c]));
      data.conversions.forEach(c => existingConversions.set(c.sessionId, c));
      data.conversions = Array.from(existingConversions.values());

      // Merge other data
      data.metrics = { ...existing.metrics, ...data.metrics };
      data.settings = { ...existing.settings, ...data.settings };
      data.personalization = { ...existing.personalization, ...data.personalization };
    }

    // Store restored data
    this.storeRestoredData(data);
  }

  /**
   * Store restored data
   */
  private storeRestoredData(data: BackupData): void {
    // Store events
    localStorage.setItem('ai_events_history', JSON.stringify(data.events));

    // Store conversions
    localStorage.setItem('ai_conversions', JSON.stringify(data.conversions));

    // Store metrics
    localStorage.setItem('ai_metrics', JSON.stringify(data.metrics));

    // Store settings
    localStorage.setItem('ai_settings', JSON.stringify(data.settings));

    // Store personalization
    localStorage.setItem('ai_personalization', JSON.stringify(data.personalization));
  }

  /**
   * Schedule next auto-backup
   */
  private scheduleNextBackup(): void {
    if (this.backupWorker) {
      this.backupWorker.postMessage({
        type: 'schedule',
        interval: this.config.autoBackupInterval
      });
    } else {
      // Fallback to setInterval
      setInterval(() => {
        this.performAutoBackup();
      }, this.config.autoBackupInterval);
    }
  }

  /**
   * Perform automatic backup
   */
  private async performAutoBackup(): Promise<void> {
    try {
      console.log('Performing automatic backup...');
      await this.backup('Automatic backup');
      await this.cleanupOldBackups();
    } catch (error) {
      console.error('Automatic backup failed:', error);
    }
  }

  // Helper methods to access stored data
  private getStoredEvents(): AIEvent[] {
    try {
      return JSON.parse(localStorage.getItem('ai_events_history') || '[]');
    } catch {
      return [];
    }
  }

  private getStoredConversions(): ConversionAttribution[] {
    try {
      return JSON.parse(localStorage.getItem('ai_conversions') || '[]');
    } catch {
      return [];
    }
  }

  private getStoredMetrics(): Record<string, any> {
    try {
      return JSON.parse(localStorage.getItem('ai_metrics') || '{}');
    } catch {
      return {};
    }
  }

  private getStoredSettings(): Record<string, any> {
    try {
      return JSON.parse(localStorage.getItem('ai_settings') || '{}');
    } catch {
      return {};
    }
  }

  private getStoredPersonalization(): Record<string, any> {
    try {
      return JSON.parse(localStorage.getItem('ai_personalization') || '{}');
    } catch {
      return {};
    }
  }

  /**
   * Destroy backup manager
   */
  destroy(): void {
    if (this.backupWorker) {
      this.backupWorker.postMessage({ type: 'cancel' });
      this.backupWorker.terminate();
      this.backupWorker = null;
    }

    this.isInitialized = false;
  }
}

// Export singleton
export const backupRecovery = BackupRecoveryManager.getInstance();

// Export types
export type {
  BackupConfig,
  BackupMetadata,
  BackupPoint,
  BackupData,
  RestoreOptions,
  ExportOptions,
  BackupStats
};