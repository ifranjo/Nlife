/**
 * Unit Tests for Backup and Recovery System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { backupRecovery } from '../src/lib/backup-recovery';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock Worker
class MockWorker {
  onmessage: ((event: any) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
}

// @ts-ignore
global.localStorage = localStorageMock;
// @ts-ignore
global.Worker = MockWorker;

describe('BackupRecoveryManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton instance
    // @ts-ignore
    backupRecovery.isInitialized = false;
    // @ts-ignore
    backupRecovery.instance = null;
    localStorageMock.clear();
  });

  afterEach(() => {
    backupRecovery.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with default config', async () => {
      await backupRecovery.initialize();

      // @ts-ignore
      expect(backupRecovery.isInitialized).toBe(true);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('geo_backup_encryption_key');
    });

    it('should initialize with custom config', async () => {
      const customConfig = {
        autoBackupInterval: 3600000, // 1 hour
        retentionDays: 7,
        compressionEnabled: false,
        encryptionEnabled: true
      };

      await backupRecovery.initialize(customConfig);

      // @ts-ignore
      const config = backupRecovery.config;
      expect(config.autoBackupInterval).toBe(3600000);
      expect(config.retentionDays).toBe(7);
      expect(config.compressionEnabled).toBe(false);
      expect(config.encryptionEnabled).toBe(true);
    });

    it('should not initialize twice', async () => {
      await backupRecovery.initialize();
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await backupRecovery.initialize();
      expect(consoleSpy).toHaveBeenCalledWith('BackupRecoveryManager already initialized');

      consoleSpy.mockRestore();
    });
  });

  describe('Backup Operations', () => {
    beforeEach(async () => {
      // Setup some test data
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'ai_events_history') return '[{"eventId":"1","timestamp":1234567890}]';
        if (key === 'ai_conversions') return '[{"sessionId":"1","value":1}]';
        if (key === 'ai_metrics') return '{"total":100}';
        if (key === 'ai_settings') return '{"enabled":true}';
        if (key === 'ai_personalization') return '{"platform":"claude"}';
        return null;
      });

      await backupRecovery.initialize();
    });

    it('should create a backup', async () => {
      const backupId = await backupRecovery.backup('Test backup');

      expect(backupId).toMatch(/^backup_\d+_[a-z0-9]+$/);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/^geo_backup_data_backup_\d+_[a-z0-9]+$/),
        expect.any(String)
      );
    });

    it('should include all data types in backup', async () => {
      const backupId = await backupRecovery.backup('Test backup');

      // Get the stored backup data
      const backupDataCall = localStorageMock.setItem.mock.calls.find(
        call => call[0].startsWith('geo_backup_data_')
      );

      expect(backupDataCall).toBeDefined();
      const storedData = JSON.parse(backupDataCall[1]);
      expect(storedData).toHaveProperty('events');
      expect(storedData).toHaveProperty('conversions');
      expect(storedData).toHaveProperty('metrics');
      expect(storedData).toHaveProperty('settings');
      expect(storedData).toHaveProperty('personalization');
    });

    it('should compress backup when enabled', async () => {
      await backupRecovery.initialize({ compressionEnabled: true });

      const backupId = await backupRecovery.backup('Compressed backup');
      const backups = await backupRecovery.listBackupPoints();
      const backup = backups.find(b => b.id === backupId);

      expect(backup?.compressed).toBe(true);
    });

    it('should encrypt backup when enabled', async () => {
      await backupRecovery.initialize({
        encryptionEnabled: true,
        encryptionKey: 'test-key-123'
      });

      const backupId = await backupRecovery.backup('Encrypted backup');
      const backups = await backupRecovery.listBackupPoints();
      const backup = backups.find(b => b.id === backupId);

      expect(backup?.encrypted).toBe(true);
    });
  });

  describe('Restore Operations', () => {
    let testBackupId: string;

    beforeEach(async () => {
      // Setup test data
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'ai_events_history') return '[{"eventId":"1","timestamp":1000}]';
        if (key === 'ai_conversions') return '[{"sessionId":"1","value":1}]';
        return '[]';
      });

      await backupRecovery.initialize();
      testBackupId = await backupRecovery.backup('Test restore backup');

      // Clear data to simulate restore
      localStorageMock.setItem.mockClear();
    });

    it('should restore from backup', async () => {
      await backupRecovery.restore(testBackupId);

      // Verify data was restored
      expect(localStorageMock.setItem).toHaveBeenCalledWith('ai_events_history', '[{"eventId":"1","timestamp":1000}]');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('ai_conversions', '[{"sessionId":"1","value":1}]');
    });

    it('should backup current state before restore when requested', async () => {
      // Add current data
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'ai_events_history') return '[{"eventId":"current","timestamp":2000}]';
        return '[]';
      });

      await backupRecovery.restore(testBackupId, { backupCurrent: true });

      // Should create a pre-restore backup
      const backupCalls = localStorageMock.setItem.mock.calls.filter(
        call => call[0].startsWith('geo_backup_data_') && call[0] !== `geo_backup_data_${testBackupId}`
      );
      expect(backupCalls.length).toBeGreaterThan(0);
    });

    it('should merge data when requested', async () => {
      // Current data
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'ai_events_history') return '[{"eventId":"current","timestamp":2000}]';
        return '[]';
      });

      await backupRecovery.restore(testBackupId, { merge: true });

      // Should have both current and restored events
      const eventsCall = localStorageMock.setItem.mock.calls.find(
        call => call[0] === 'ai_events_history'
      );
      const events = JSON.parse(eventsCall[1]);
      expect(events).toHaveLength(2);
      expect(events).toContainEqual(expect.objectContaining({ eventId: '1' }));
      expect(events).toContainEqual(expect.objectContaining({ eventId: 'current' }));
    });

    it('should fail restore if backup not found', async () => {
      await expect(backupRecovery.restore('non-existent')).rejects.toThrow('Backup not found');
    });
  });

  describe('Import/Export', () => {
    beforeEach(async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'ai_events_history') return '[{"eventId":"1","timestamp":1000}]';
        return '[]';
      });

      await backupRecovery.initialize();
    });

    it('should export backup as JSON', async () => {
      const backupId = await backupRecovery.backup('Export test');
      const url = await backupRecovery.exportBackup(backupId, {
        format: 'json',
        includeMetadata: true,
        prettify: false
      });

      expect(url).toMatch(/^blob:/);

      // Verify blob was created
      const blobSpy = vi.spyOn(global, 'Blob');
      expect(blobSpy).toHaveBeenCalledWith(
        [expect.any(String)],
        { type: 'application/json' }
      );
    });

    it('should import backup from JSON', async () => {
      const importData = {
        events: [{ eventId: 'imported', timestamp: 3000 }],
        conversions: [],
        metrics: {},
        settings: {},
        personalization: {}
      };

      const importJson = JSON.stringify(importData);
      const backupId = await backupRecovery.importBackup(importJson);

      expect(backupId).toMatch(/^backup_\d+_[a-z0-9]+$/);

      // Verify backup was created
      const backups = await backupRecovery.listBackupPoints();
      expect(backups.some(b => b.id === backupId)).toBe(true);
    });

    it('should import and restore in one operation', async () => {
      const importData = {
        events: [{ eventId: 'imported', timestamp: 3000 }],
        conversions: [],
        metrics: { imported: true },
        settings: {},
        personalization: {}
      };

      const importJson = JSON.stringify(importData);
      await backupRecovery.importBackup(importJson, { merge: false });

      // Verify data was restored
      const metricsCall = localStorageMock.setItem.mock.calls.find(
        call => call[0] === 'ai_metrics'
      );
      expect(metricsCall).toBeDefined();
      expect(JSON.parse(metricsCall[1])).toEqual({ imported: true });
    });
  });

  describe('Backup Management', () => {
    beforeEach(async () => {
      await backupRecovery.initialize();
    });

    it('should list all backup points', async () => {
      // Create multiple backups
      const id1 = await backupRecovery.backup('First backup');
      const id2 = await backupRecovery.backup('Second backup');
      const id3 = await backupRecovery.backup('Third backup');

      const backups = await backupRecovery.listBackupPoints();

      expect(backups).toHaveLength(3);
      expect(backups[0].id).toBe(id3); // Most recent first
      expect(backups[1].id).toBe(id2);
      expect(backups[2].id).toBe(id1);
    });

    it('should get backup statistics', async () => {
      // Create some backups
      await backupRecovery.backup('Test 1');
      await backupRecovery.backup('Test 2');

      const stats = await backupRecovery.getBackupStats();

      expect(stats.totalBackups).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.averageSize).toBeGreaterThan(0);
      expect(stats.oldestBackup).toBeLessThan(stats.newestBackup);
    });

    it('should delete backup', async () => {
      const backupId = await backupRecovery.backup('To be deleted');

      await backupRecovery.deleteBackup(backupId);

      const backups = await backupRecovery.listBackupPoints();
      expect(backups.some(b => b.id === backupId)).toBe(false);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        `geo_backup_data_${backupId}`
      );
    });

    it('should cleanup old backups', async () => {
      // Create backup with old timestamp
      const oldBackup = {
        metadata: {
          id: 'old_backup',
          timestamp: Date.now() - 40 * 24 * 60 * 60 * 1000, // 40 days old
          version: '1.0',
          size: 1000,
          compressed: false,
          encrypted: false,
          checksum: 'abc123',
          dataTypes: ['events']
        },
        data: '{}'
      };

      // Manually store old backup
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'geo_backup_points') return JSON.stringify([oldBackup.metadata]);
        if (key === 'geo_backup_data_old_backup') return JSON.stringify(oldBackup.data);
        return null;
      });

      // Trigger cleanup
      // @ts-ignore
      await backupRecovery.cleanupOldBackups();

      // Old backup should be deleted
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('geo_backup_data_old_backup');
    });
  });

  describe('Data Integrity', () => {
    beforeEach(async () => {
      await backupRecovery.initialize({ verifyBackups: true });
    });

    it('should verify backup integrity', async () => {
      const backupId = await backupRecovery.backup('Integrity test');

      // @ts-ignore
      const verified = await backupRecovery.verifyBackup(backupId);
      expect(verified).toBe(true);
    });

    it('should detect corrupted backup', async () => {
      const backupId = await backupRecovery.backup('Corruption test');

      // Corrupt the stored data
      const corruptData = '{"corrupted": true}';
      localStorageMock.setItem(`geo_backup_data_${backupId}`, corruptData);

      // @ts-ignore
      const verified = await backupRecovery.verifyBackup(backupId);
      expect(verified).toBe(false);
    });

    it('should fail restore if verification fails', async () => {
      const backupId = await backupRecovery.backup('Verification test');

      // Corrupt the stored data
      const corruptData = '{"corrupted": true}';
      localStorageMock.setItem(`geo_backup_data_${backupId}`, corruptData);

      await expect(backupRecovery.restore(backupId, { verify: true }))
        .rejects.toThrow('Backup verification failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Quota exceeded');
      });

      await backupRecovery.initialize();

      // Should not throw, but log warning
      await expect(backupRecovery.backup('Error test')).resolves.toBeDefined();
    });

    it('should handle corrupted backup data', async () => {
      await backupRecovery.initialize();

      // Create backup with invalid JSON
      const invalidBackup = {
        metadata: {
          id: 'invalid_backup',
          timestamp: Date.now(),
          version: '1.0',
          size: 100,
          compressed: false,
          encrypted: false,
          checksum: 'invalid',
          dataTypes: ['events']
        },
        data: 'invalid-json{'
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'geo_backup_points') return JSON.stringify([invalidBackup.metadata]);
        if (key === 'geo_backup_data_invalid_backup') return JSON.stringify(invalidBackup.data);
        return null;
      });

      await expect(backupRecovery.restore('invalid_backup'))
        .rejects.toThrow('Failed to restore backup');
    });
  });
});