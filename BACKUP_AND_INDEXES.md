# Backup and Index Strategy

## Backup
For production, schedule MongoDB backups, encrypt backup storage, retain multiple restore points, and test restores regularly. A backup is not considered valid until a restore has been tested.

## Current indexes
- unique `studentId`
- sparse unique `admissionNo`
- unique `class + section + rollNo`
- `class + section + status`
- `isDeleted + status + createdAt`
- `isDeleted + class + section + rollNo`
- audit: `entityType + entityId + createdAt`

Review indexes with real production query patterns before adding more; every index increases write and storage cost.
