/**
 * Backup Recovery Wizard Component
 *
 * Interactive UI for managing backups and recovery operations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { backupRecovery, type BackupMetadata, type BackupStats, type RestoreOptions } from '../../lib/backup-recovery';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface BackupWithDetails extends BackupMetadata {
  formattedSize: string;
  formattedDate: string;
  age: string;
}

export default function BackupRecoveryWizard({ isOpen, onClose }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [backups, setBackups] = useState<BackupWithDetails[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'restore' | 'settings'>('list');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [restoreOptions, setRestoreOptions] = useState<RestoreOptions>({
    merge: false,
    verify: true,
    backupCurrent: true
  });

  // Load backups on mount
  useEffect(() => {
    if (isOpen) {
      loadBackups();
    }
  }, [isOpen]);

  const loadBackups = useCallback(async () => {
    setIsLoading(true);
    try {
      const [backupList, backupStats] = await Promise.all([
        backupRecovery.listBackupPoints(),
        backupRecovery.getBackupStats()
      ]);

      const formattedBackups = backupList.map(backup => ({
        ...backup,
        formattedSize: formatBytes(backup.size),
        formattedDate: new Date(backup.timestamp).toLocaleString(),
        age: getAgeString(backup.timestamp)
      }));

      setBackups(formattedBackups);
      setStats(backupStats);
    } catch (error) {
      showMessage('error', 'Failed to load backups');
      console.error('Failed to load backups:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAgeString = (timestamp: number): string => {
    const age = Date.now() - timestamp;
    const minutes = Math.floor(age / 60000);
    const hours = Math.floor(age / 3600000);
    const days = Math.floor(age / 86400000);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleCreateBackup = async () => {
    setIsLoading(true);
    try {
      const backupId = await backupRecovery.backup('Manual backup from wizard');
      showMessage('success', 'Backup created successfully!');
      await loadBackups();
      setActiveTab('list');
    } catch (error) {
      showMessage('error', 'Failed to create backup');
      console.error('Failed to create backup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;

    setIsLoading(true);
    try {
      await backupRecovery.restore(selectedBackup, restoreOptions);
      showMessage('success', 'Restore completed successfully!');
      setActiveTab('list');
      setSelectedBackup(null);
    } catch (error) {
      showMessage('error', 'Failed to restore backup');
      console.error('Failed to restore backup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (backupId: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) return;

    setIsLoading(true);
    try {
      await backupRecovery.deleteBackup(backupId);
      showMessage('success', 'Backup deleted successfully');
      await loadBackups();
    } catch (error) {
      showMessage('error', 'Failed to delete backup');
      console.error('Failed to delete backup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (backupId: string) => {
    try {
      const url = await backupRecovery.exportBackup(backupId, {
        format: 'json',
        includeMetadata: true,
        prettify: true
      });

      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${backupId}.json`;
      a.click();

      URL.revokeObjectURL(url);
      showMessage('success', 'Backup exported successfully');
    } catch (error) {
      showMessage('error', 'Failed to export backup');
      console.error('Failed to export backup:', error);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setIsLoading(true);
    try {
      const text = await importFile.text();
      await backupRecovery.importBackup(text, restoreOptions);
      showMessage('success', 'Backup imported successfully');
      await loadBackups();
      setImportFile(null);
      setActiveTab('list');
    } catch (error) {
      showMessage('error', 'Failed to import backup');
      console.error('Failed to import backup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Backup & Recovery Wizard</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 mx-6 mt-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-900 text-green-200' :
            message.type === 'error' ? 'bg-red-900 text-red-200' :
            'bg-blue-900 text-blue-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-700 px-6">
          {[
            { id: 'list', label: 'Backups List' },
            { id: 'create', label: 'Create Backup' },
            { id: 'restore', label: 'Restore' },
            { id: 'settings', label: 'Settings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'list' && (
            <div>
              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">Total Backups</div>
                    <div className="text-2xl font-bold text-white">{stats.totalBackups}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">Total Size</div>
                    <div className="text-2xl font-bold text-white">{formatBytes(stats.totalSize)}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">Average Size</div>
                    <div className="text-2xl font-bold text-white">{formatBytes(stats.averageSize)}</div>
                  </div>
                </div>
              )}

              {/* Backups List */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-400">Loading backups...</div>
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">No backups found</div>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="btn-primary"
                  >
                    Create First Backup
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {backups.map(backup => (
                    <div
                      key={backup.id}
                      className="bg-gray-800 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-white font-medium">
                            {backup.description || 'Backup'}
                          </div>
                          <div className="flex gap-2">
                            {backup.compressed && (
                              <span className="px-2 py-1 bg-blue-900 text-blue-200 text-xs rounded">
                                Compressed
                              </span>
                            )}
                            {backup.encrypted && (
                              <span className="px-2 py-1 bg-green-900 text-green-200 text-xs rounded">
                                Encrypted
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-gray-400 text-sm">
                          {backup.formattedDate} • {backup.age} • {backup.formattedSize}
                        </div>
                        <div className="text-gray-500 text-xs mt-1">
                          Types: {backup.dataTypes.join(', ')}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedBackup(backup.id);
                            setActiveTab('restore');
                          }}
                          className="btn-secondary text-sm"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handleExport(backup.id)}
                          className="btn-secondary text-sm"
                        >
                          Export
                        </button>
                        <button
                          onClick={() => handleDelete(backup.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <div className="text-center py-12">
              <div className="text-white text-lg mb-4">Create a new backup</div>
              <div className="text-gray-400 mb-8">
                This will create a complete backup of all your GEO analytics data
              </div>
              <button
                onClick={handleCreateBackup}
                disabled={isLoading}
                className="btn-primary"
              >
                {isLoading ? 'Creating...' : 'Create Backup'}
              </button>
            </div>
          )}

          {activeTab === 'restore' && (
            <div>
              <div className="mb-6">
                <h3 className="text-white text-lg font-medium mb-4">Import Backup</h3>
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-6">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="import-file"
                  />
                  <label
                    htmlFor="import-file"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-white">
                      {importFile ? importFile.name : 'Click to select backup file'}
                    </span>
                    <span className="text-gray-400 text-sm mt-1">
                      JSON format, max 10MB
                    </span>
                  </label>
                </div>
                {importFile && (
                  <button
                    onClick={handleImport}
                    disabled={isLoading}
                    className="btn-primary mt-4"
                  >
                    {isLoading ? 'Importing...' : 'Import Backup'}
                  </button>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-white text-lg font-medium mb-4">Restore Options</h3>
                <div className="space-y-3">
                  <label className="flex items-center text-gray-300">
                    <input
                      type="checkbox"
                      checked={restoreOptions.merge}
                      onChange={(e) => setRestoreOptions(prev => ({ ...prev, merge: e.target.checked }))}
                      className="mr-3"
                    />
                    Merge with existing data (instead of replacing)
                  </label>
                  <label className="flex items-center text-gray-300">
                    <input
                      type="checkbox"
                      checked={restoreOptions.verify}
                      onChange={(e) => setRestoreOptions(prev => ({ ...prev, verify: e.target.checked }))}
                      className="mr-3"
                    />
                    Verify backup integrity before restore
                  </label>
                  <label className="flex items-center text-gray-300">
                    <input
                      type="checkbox"
                      checked={restoreOptions.backupCurrent}
                      onChange={(e) => setRestoreOptions(prev => ({ ...prev, backupCurrent: e.target.checked }))}
                      className="mr-3"
                    />
                    Create backup of current state before restore
                  </label>
                </div>
              </div>

              {selectedBackup && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-white mb-2">Selected Backup:</div>
                  <div className="text-gray-400 text-sm">
                    {backups.find(b => b.id === selectedBackup)?.description}
                  </div>
                  <button
                    onClick={handleRestore}
                    disabled={isLoading}
                    className="btn-primary mt-4"
                  >
                    {isLoading ? 'Restoring...' : 'Restore Selected Backup'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="text-gray-300">
              <h3 className="text-white text-lg font-medium mb-4">Backup Settings</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-white font-medium mb-2">Auto-backup Interval</div>
                  <div className="text-gray-400">Backups are automatically created every 6 hours</div>
                </div>
                <div>
                  <div className="text-white font-medium mb-2">Retention Policy</div>
                  <div className="text-gray-400">Backups are kept for 30 days (maximum 100 backups)</div>
                </div>
                <div>
                  <div className="text-white font-medium mb-2">Storage Location</div>
                  <div className="text-gray-400">All backups are stored locally in your browser</div>
                </div>
                <div>
                  <div className="text-white font-medium mb-2">Encryption</div>
                  <div className="text-gray-400">Client-side encryption is available for sensitive data</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-6 flex justify-end">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}