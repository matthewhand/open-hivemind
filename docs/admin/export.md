# Export & System Data

The **Export & System Data** page (`/admin/export`) provides tools for managing system backups, exporting configurations, and accessing API specifications. This is essential for disaster recovery, migration, and development.

## System Backups

Backups capture the full system configuration, including bots, personas, and settings.

![Export Page](../images/export-page.png)

### Creating a Backup
1.  Navigate to **Admin > Export & System Data**.
2.  Click the **Create Backup** button in the "System Backups" section.
3.  Enter a descriptive name and optional description in the modal.
4.  Click **Create Backup**.

![Create Backup Modal](../images/create-backup-modal.png)

### Managing Backups
The backup list displays all available backups with their size and creation date.
*   **Restore**: Click the <kbd>↺</kbd> icon to restore a backup. **Warning**: This will overwrite the current configuration.
*   **Download**: Click the <kbd>⬇</kbd> icon to download the backup file (`.json.gz`) to your local machine.
*   **Delete**: Click the <kbd>🗑</kbd> icon to permanently remove a backup.

## Configuration Export

You can export the current running configuration as a raw JSON file. This is useful for debugging or manual migration to another instance.

1.  Locate the **Configuration Export** card.
2.  Click **Export Config**.
3.  The `config-export-*.json` file will be downloaded.

## API Specifications

For developers integrating with Open Hivemind, the OpenAPI specification is available for download.

1.  Locate the **API Specifications** card.
2.  Click **JSON** or **YAML** to download the spec in your preferred format.
