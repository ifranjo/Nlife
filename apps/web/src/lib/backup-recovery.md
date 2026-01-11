# Backup and Recovery System for GEO Analytics

## Overview

The Backup and Recovery System provides robust backup/restore functionality for AI analytics data using only client-side storage (localStorage/IndexedDB). It features automated backups, compression, encryption, and an intuitive recovery wizard.

## Features

- **Automated Backups**: Scheduled every 6 hours via Web Workers
- **Data Compression**: Gzip compression to reduce storage size
- **Client-side Encryption**: Optional encryption for sensitive data
- **Version Management**: 30-day retention with configurable limits
- **Recovery Wizard**: Interactive UI for all backup operations
- **Import/Export**: Full backup portability
- **Integrity Verification**: Checksum validation for all backups

## Quick Start

### Basic Usage

```typescript
import { backupRecovery } from '../lib/backup-recovery';

// Initialize the backup system
await backupRecovery.initialize({
  autoBackupInterval: 6 * 60 * 60 * 1000, // 6 hours
  retentionDays: 30,
  compressionEnabled: true,
  encryptionEnabled: false,
  maxBackups: 100
});

// Create a manual backup
const backupId = await backupRecovery.backup('Manual backup before update');

// List all backups
const backups = await backupRecovery.listBackupPoints();
console.log(`Found ${backups.length} backups`);

// Restore from backup
await backupRecovery.restore(backupId, {
  merge: false, // Replace existing data
  verify: true, // Verify integrity
  backupCurrent: true // Backup current state first
});
```

### Using the Recovery Wizard

```tsx
import BackupRecoveryWizard from '../components/dashboard/BackupRecoveryWizard';

function AdminDashboard() {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <>
      <button onClick={() => setShowWizard(true)}>
        Open Backup Manager
      </button>

      <BackupRecoveryWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
      />
    </>
  );
}
```

## API Reference

### BackupRecoveryManager

#### Methods

##### `initialize(config?: Partial<BackupConfig>): Promise<void>`

Initializes the backup system with optional configuration.

**Parameters:**
- `config` - Configuration options (see BackupConfig below)

**Example:**
```typescript
await backupRecovery.initialize({
  compressionEnabled: true,
  encryptionEnabled: true
});
```

##### `backup(description?: string): Promise<string>`

Creates a new backup of current analytics data.

**Parameters:**
- `description` - Optional description for the backup

**Returns:**
- Promise resolving to the backup ID

**Example:**
```typescript
const backupId = await backupRecovery.backup('Weekly backup');
```

##### `restore(pointId: string, options?: Partial<RestoreOptions>): Promise<void>`

Restores data from a backup point.

**Parameters:**
- `pointId` - The backup ID to restore from
- `options` - Restore options (see RestoreOptions below)

**Example:**
```typescript
await backupRecovery.restore(backupId, {
  merge: true,
  backupCurrent: true
});
```

##### `listBackupPoints(): Promise<BackupMetadata[]>`

Lists all available backup points.

**Returns:**
- Promise resolving to array of backup metadata, sorted by timestamp (newest first)

**Example:**
```typescript
const backups = await backupRecovery.listBackupPoints();
backups.forEach(backup => {
  console.log(`${backup.id}: ${new Date(backup.timestamp).toLocaleString()}`);
});
```

##### `getBackupStats(): Promise<BackupStats>`

Gets statistics about all backups.

**Returns:**
- Promise resolving to backup statistics

**Example:**
```typescript
const stats = await backupRecovery.getBackupStats();
console.log(`Total size: ${stats.totalSize} bytes`);
```

##### `exportBackup(pointId: string, options?: Partial<ExportOptions>): Promise<string>`

Exports a backup as a downloadable file.

**Parameters:**
- `pointId` - The backup ID to export
- `options` - Export options (see ExportOptions below)

**Returns:**
- Promise resolving to a blob URL for download

**Example:**
```typescript
const url = await backupRecovery.exportBackup(backupId, {
  format: 'json',
  prettify: true
});

// Create download link
const a = document.createElement('a');
a.href = url;
a.download = `backup-${backupId}.json`;
a.click();
```

##### `importBackup(data: string, options?: Partial<RestoreOptions>): Promise<string>`

Imports a backup from JSON data.

**Parameters:**
- `data` - The backup data as JSON string
- `options` - Import/restore options

**Returns:**
- Promise resolving to the new backup ID

**Example:**
```typescript
const backupData = await file.text();
const newBackupId = await backupRecovery.importBackup(backupData);
```

##### `deleteBackup(pointId: string): Promise<void>`

Deletes a specific backup.

**Parameters:**
- `pointId` - The backup ID to delete

**Example:**
```typescript
await backupRecovery.deleteBackup(backupId);
```

### Types

#### BackupConfig

```typescript
interface BackupConfig {
  autoBackupInterval: number; // ms between auto-backups (default: 6 hours)
  retentionDays: number; // days to retain backups (default: 30)
  compressionEnabled: boolean; // enable gzip compression
  encryptionEnabled: boolean; // enable client-side encryption
  encryptionKey?: string; // optional encryption key
  maxBackups: number; // maximum number of backups to keep
  verifyBackups: boolean; // verify backup integrity
}
```

#### BackupMetadata

```typescript
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
```

#### RestoreOptions

```typescript
interface RestoreOptions {
  merge: boolean; // merge with existing data vs replace
  verify: boolean; // verify before restore
  backupCurrent: boolean; // backup current state before restore
}
```

#### ExportOptions

```typescript
interface ExportOptions {
  format: 'json' | 'encrypted';
  includeMetadata: boolean;
  prettify: boolean;
}
```

## Advanced Usage

### Custom Backup Schedule

```typescript
// Back up every 2 hours
await backupRecovery.initialize({
  autoBackupInterval: 2 * 60 * 60 * 1000
});
```

### Encryption Setup

```typescript
// Enable encryption with auto-generated key
await backupRecovery.initialize({
  encryptionEnabled: true
});

// Or provide your own key
await backupRecovery.initialize({
  encryptionEnabled: true,
  encryptionKey: 'my-secret-key-12345'
});
```

### Selective Restore

```typescript
// Only restore events, keeping current conversions
const backup = await backupRecovery.getBackup(backupId);
if (backup) {
  const data = JSON.parse(backup.data);

  // Modify data before restore
  data.conversions = []; // Don't restore conversions

  await backupRecovery.importBackup(JSON.stringify(data));
}
```

### Backup Verification

```typescript
// Verify all backups
const backups = await backupRecovery.listBackupPoints();
for (const backup of backups) {
  const isValid = await backupRecovery.verifyBackup(backup.id);
  console.log(`${backup.id}: ${isValid ? 'Valid' : 'Corrupted'}`);
}
```

## Recovery Wizard Features

The Recovery Wizard provides a complete UI for:

1. **Viewing Backups**: List all backups with metadata, size, and age
2. **Creating Backups**: One-click backup creation with description
3. **Restoring Data**:
   - Import from file
   - Select from existing backups
   - Configure restore options (merge, verify, pre-backup)
4. **Exporting Backups**: Download backups as JSON files
5. **Settings**: View current backup configuration

### Wizard Usage

```tsx
import BackupRecoveryWizard from '../components/dashboard/BackupRecoveryWizard';

// In your component
const [showWizard, setShowWizard] = useState(false);

// Open wizard
<button onClick={() => setShowWizard(true)}>
  Manage Backups
</button>

// Wizard component
<BackupRecoveryWizard
  isOpen={showWizard}
  onClose={() => setShowWizard(false)}
/>
```

## Best Practices

1. **Regular Backups**: Keep automatic backups enabled for data safety
2. **Pre-Update Backups**: Always backup before major changes
3. **Export Important Backups**: Export critical backups for external storage
4. **Verify Integrity**: Periodically verify backup integrity
5. **Monitor Storage**: Keep an eye on localStorage usage
6. **Test Restores**: Regularly test restore procedures

## Storage Considerations

- All data is stored in browser localStorage
- Maximum backup size depends on available localStorage quota (typically 5-10MB)
- Compressed backups can reduce size by 50-80%
- Old backups are automatically cleaned up based on retention policy
- Each backup includes metadata for verification

## Error Handling

The system handles common errors gracefully:

- **Storage Quota Exceeded**: Falls back to uncompressed storage
- **Corrupted Backups**: Skips corrupted backups during listing
- **Missing Data**: Handles missing analytics data gracefully
- **Encryption Errors**: Falls back to unencrypted mode

## Security Notes

- Encryption is performed client-side using XOR cipher
- For production use, implement proper encryption (AES)
- Encryption keys are stored in localStorage
- Consider user authentication for sensitive data
- Never store actual encryption keys in code

## Performance

- Backups are created asynchronously
- Web Workers handle scheduled backups without blocking UI
- Compression adds ~10ms per MB of data
- Verification doubles backup time but ensures integrity
- Import/export operations are I/O bound

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (may have lower storage quotas)
- Mobile browsers: Limited by storage quotas

## Troubleshooting

### Backup Fails
1. Check localStorage quota
2. Disable compression if storage is tight
3. Reduce retention period

### Restore Fails
1. Verify backup integrity
2. Check for corrupted backup files
3. Ensure sufficient memory

### Missing Backups
1. Check if old backups were cleaned up
2. Verify localStorage hasn't been cleared
3. Check browser storage permissions

### Import/Export Issues
1. Verify JSON format is valid
2. Check file size limits
3. Ensure proper file encoding (UTF-8)

## Migration Guide

To migrate from manual backup systems:

1. Initialize the backup manager
2. Import existing data using `importBackup()`
3. Enable automatic backups
4. Train users on the recovery wizard
5. Document your backup procedures

## Future Enhancements

- IndexedDB support for larger backups
- Incremental backups
- Cloud sync options
- Backup scheduling UI
- Compression algorithm selection
- Multiple encryption methods
- Backup compression ratios display
- Storage usage analytics

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the test cases for examples
3. Verify browser console for error messages
4. Ensure all dependencies are properly initialized