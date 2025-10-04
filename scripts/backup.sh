#!/bin/bash

# Backup and Disaster Recovery Script
# Usage: ./scripts/backup.sh [command]
# Commands: backup, restore, schedule, verify, clean

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
LOG_FILE="$PROJECT_ROOT/logs/backup.log"

# Backup configuration
BACKUP_CONFIG=(
    "config:Configuration files"
    "data:Database and data files"
    "logs:Application logs"
    "scripts:Custom scripts"
    ".env:Environment variables"
    "package.json:Dependencies and scripts"
    "tsconfig.json:TypeScript configuration"
    ".github:GitHub workflows and configuration"
)

# Create necessary directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$PROJECT_ROOT/logs"

echo -e "${BLUE}💾 Open Hivemind Backup & Disaster Recovery${NC}"
echo -e "${BLUE}📁 Project root: ${PROJECT_ROOT}${NC}"
echo -e "${BLUE}💾 Backup directory: ${BACKUP_DIR}${NC}"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    echo -e "${RED}❌ $1${NC}" >&2
    exit 1
}

# Function to create backup
create_backup() {
    echo -e "${YELLOW}💾 Creating backup...${NC}"

    local backup_name="backup_${TIMESTAMP}"
    local backup_path="$BACKUP_DIR/$backup_name"

    # Create backup directory
    mkdir -p "$backup_path"

    log "Creating backup: $backup_name"

    # Backup each configured item
    for item in "${BACKUP_CONFIG[@]}"; do
        local source="${item%%:*}"
        local description="${item#*:}"

        echo -e "${BLUE}📦 Backing up $description...${NC}"

        if [[ -e "$PROJECT_ROOT/$source" ]]; then
            cp -r "$PROJECT_ROOT/$source" "$backup_path/" || log "Warning: Failed to backup $source"
        else
            log "Warning: $source not found, skipping"
        fi
    done

    # Create backup manifest
    cat > "$backup_path/manifest.json" << EOF
{
  "backup_name": "$backup_name",
  "timestamp": "$(date -Iseconds)",
  "created_by": "$(whoami)",
  "backup_version": "1.0",
  "items": [
EOF

    for item in "${BACKUP_CONFIG[@]}"; do
        local source="${item%%:*}"
        local description="${item#*:}"
        echo "    {\"source\": \"$source\", \"description\": \"$description\"}," >> "$backup_path/manifest.json"
    done

    # Remove trailing comma and close JSON
    sed -i '$ s/,$//' "$backup_path/manifest.json"
    cat >> "$backup_path/manifest.json" << EOF
  ]
}
EOF

    # Create backup archive
    echo -e "${BLUE}🗜️  Creating backup archive...${NC}"
    cd "$BACKUP_DIR"
    tar -czf "${backup_name}.tar.gz" "$backup_name/"
    rm -rf "$backup_name/"

    # Verify backup
    if [[ -f "${backup_name}.tar.gz" ]]; then
        local backup_size=$(du -h "${backup_name}.tar.gz" | cut -f1)
        log "Backup created successfully: ${backup_name}.tar.gz (${backup_size})"
        echo -e "${GREEN}✅ Backup created: ${backup_name}.tar.gz (${backup_size})${NC}"

        # Create backup info file
        cat > "${backup_name}.info" << EOF
Backup Name: ${backup_name}
Timestamp: $(date -Iseconds)
Size: ${backup_size}
Files: $(tar -tzf "${backup_name}.tar.gz" | wc -l)
Created by: $(whoami)
Backup Type: Full
Retention: ${RETENTION_DAYS} days
EOF
    else
        error_exit "Failed to create backup archive"
    fi

    # Clean old backups
    clean_old_backups
}

# Function to restore backup
restore_backup() {
    local backup_file="$1"

    if [[ -z "$backup_file" ]]; then
        echo -e "${YELLOW}📋 Available backups:${NC}"
        ls -la "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -10 || echo "No backups found"
        echo ""
        read -p "Enter backup file to restore: " backup_file
    fi

    backup_file="${backup_file%.tar.gz}.tar.gz"

    if [[ ! -f "$BACKUP_DIR/$backup_file" ]]; then
        error_exit "Backup file not found: $backup_file"
    fi

    echo -e "${YELLOW}⚠️  WARNING: This will restore the backup and may overwrite existing files${NC}"
    read -p "Are you sure you want to continue? (y/N): " confirm

    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo -e "${BLUE}❌ Restore cancelled${NC}"
        exit 0
    fi

    echo -e "${YELLOW}🔄 Restoring from backup: $backup_file${NC}"

    # Create restore directory
    local restore_dir="$BACKUP_DIR/restore_${TIMESTAMP}"
    mkdir -p "$restore_dir"

    log "Starting restore from: $backup_file"

    # Extract backup
    cd "$restore_dir"
    tar -xzf "$BACKUP_DIR/$backup_file" || error_exit "Failed to extract backup"

    # Find backup directory
    local backup_dir=$(find . -maxdepth 1 -type d -name "backup_*" | head -1)

    if [[ -z "$backup_dir" ]]; then
        error_exit "Invalid backup format"
    fi

    # Verify backup manifest
    if [[ ! -f "$backup_dir/manifest.json" ]]; then
        error_exit "Backup manifest not found"
    fi

    # Show backup info
    echo -e "${BLUE}📋 Backup Information:${NC}"
    cat "$backup_dir/manifest.json" | jq '.' 2>/dev/null || cat "$backup_dir/manifest.json"
    echo ""

    # Restore files
    echo -e "${YELLOW}🔄 Restoring files to $PROJECT_ROOT${NC}"

    for item in "${BACKUP_CONFIG[@]}"; do
        local source="${item%%:*}"
        local description="${item#*:}"

        if [[ -e "$backup_dir/$source" ]]; then
            echo -e "${BLUE}📦 Restoring $description...${NC}"

            # Create backup of existing files
            if [[ -e "$PROJECT_ROOT/$source" ]]; then
                local existing_backup="$PROJECT_ROOT/$source.backup_$TIMESTAMP"
                cp -r "$PROJECT_ROOT/$source" "$existing_backup" || log "Warning: Failed to backup existing $source"
                log "Existing $source backed up to: $existing_backup"
            fi

            # Restore files
            cp -r "$backup_dir/$source" "$PROJECT_ROOT/" || log "Warning: Failed to restore $source"
            log "Restored: $source"
        else
            log "Warning: $source not found in backup"
        fi
    done

    # Clean up restore directory
    rm -rf "$restore_dir"

    log "Restore completed successfully from: $backup_file"
    echo -e "${GREEN}✅ Restore completed successfully${NC}"
    echo -e "${BLUE}💡 Review the restored files and restart services if needed${NC}"
}

# Function to clean old backups
clean_old_backups() {
    echo -e "${BLUE}🧹 Cleaning old backups (retention: $RETENTION_DAYS days)...${NC}"

    local count=0
    local size_before=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)

    # Find and remove old backups
    while IFS= read -r -d '' backup_file; do
        local file_date=$(stat -c %Y "$backup_file" 2>/dev/null || echo 0)
        local current_date=$(date +%s)
        local days_old=$(( (current_date - file_date) / 86400 ))

        if [[ $days_old -gt $RETENTION_DAYS ]]; then
            rm -f "$backup_file"
            log "Removed old backup: $(basename "$backup_file") ($days_old days old)"
            ((count++))
        fi
    done < <(find "$BACKUP_DIR" -name "*.tar.gz" -type f -print0 2>/dev/null)

    local size_after=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)

    echo -e "${GREEN}✅ Cleaned $count old backup(s)${NC}"
    if [[ -n "$size_before" && -n "$size_after" ]]; then
        echo -e "${BLUE}📦 Storage: $size_before → $size_after${NC}"
    fi
}

# Function to verify backup integrity
verify_backup() {
    local backup_file="$1"

    if [[ -z "$backup_file" ]]; then
        echo -e "${YELLOW}📋 Available backups:${NC}"
        ls -la "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -10 || echo "No backups found"
        echo ""
        read -p "Enter backup file to verify: " backup_file
    fi

    backup_file="${backup_file%.tar.gz}.tar.gz"

    if [[ ! -f "$BACKUP_DIR/$backup_file" ]]; then
        error_exit "Backup file not found: $backup_file"
    fi

    echo -e "${YELLOW}🔍 Verifying backup integrity: $backup_file${NC}"

    # Check file integrity
    if ! gzip -t "$BACKUP_DIR/$backup_file" > /dev/null 2>&1; then
        error_exit "Backup file is corrupted (gzip test failed)"
    fi

    # Extract and verify structure
    local verify_dir="$BACKUP_DIR/verify_${TIMESTAMP}"
    mkdir -p "$verify_dir"

    cd "$verify_dir"

    # Extract backup
    if ! tar -xzf "$BACKUP_DIR/$backup_file" > /dev/null 2>&1; then
        rm -rf "$verify_dir"
        error_exit "Backup extraction failed (tar test failed)"
    fi

    # Find backup directory
    local backup_dir=$(find . -maxdepth 1 -type d -name "backup_*" | head -1)

    if [[ -z "$backup_dir" ]]; then
        rm -rf "$verify_dir"
        error_exit "Invalid backup format"
    fi

    # Verify manifest
    if [[ ! -f "$backup_dir/manifest.json" ]]; then
        rm -rf "$verify_dir"
        error_exit "Backup manifest missing"
    fi

    # Check files in backup
    local missing_files=0
    local total_files=0

    while IFS= read -r item; do
        local source=$(echo "$item" | jq -r '.source' 2>/dev/null)
        [[ "$source" == "null" ]] && continue

        ((total_files++))

        if [[ ! -e "$backup_dir/$source" ]]; then
            log "Missing file in backup: $source"
            ((missing_files++))
        fi
    done < <(cat "$backup_dir/manifest.json" | jq -r '.items[] | @base64')

    # Calculate backup size
    local backup_size=$(du -sh "$BACKUP_DIR/$backup_file" | cut -f1)
    local file_count=$(tar -tzf "$BACKUP_DIR/$backup_file" | wc -l)

    # Clean up
    rm -rf "$verify_dir"

    # Report results
    echo -e "${BLUE}📊 Verification Results:${NC}"
    echo -e "${BLUE}   Backup file: $backup_file${NC}"
    echo -e "${BLUE}   Size: $backup_size${NC}"
    echo -e "${BLUE}   Files: $file_count${NC}"
    echo -e "${BLUE}   Missing files: $missing_files${NC}"
    echo -e "${BLUE}   Total expected: $total_files${NC}"

    if [[ $missing_files -eq 0 ]]; then
        echo -e "${GREEN}✅ Backup integrity verified successfully${NC}"
        log "Backup verification passed: $backup_file"
    else
        echo -e "${RED}❌ Backup verification failed: $missing_files missing files${NC}"
        log "Backup verification failed: $backup_file"
        exit 1
    fi
}

# Function to schedule automatic backups
schedule_backup() {
    local cron_schedule="$1"

    if [[ -z "$cron_schedule" ]]; then
        echo -e "${YELLOW}⏰ Setting up automatic backup schedule${NC}"
        echo ""
        echo "Available schedules:"
        echo "1. Daily at 2 AM (0 2 * * *)"
        echo "2. Weekly on Sunday at 2 AM (0 2 * * 0)"
        echo "3. Monthly on 1st at 2 AM (0 2 1 * *)"
        echo "4. Custom schedule"
        echo ""
        read -p "Select schedule (1-4): " choice

        case "$choice" in
            1) cron_schedule="0 2 * * *" ;;
            2) cron_schedule="0 2 * * 0" ;;
            3) cron_schedule="0 2 1 * *" ;;
            4)
                read -p "Enter cron schedule (e.g., 0 2 * * *): " cron_schedule
                ;;
            *)
                error_exit "Invalid schedule selection"
                ;;
        esac
    fi

    echo -e "${YELLOW}⏰ Scheduling automatic backup: $cron_schedule${NC}"

    # Create backup script path
    local backup_script="$PROJECT_ROOT/scripts/backup.sh"

    # Add to crontab
    local cron_job="$cron_schedule $backup_script backup"

    # Export crontab
    (crontab -l 2>/dev/null; echo "$cron_job") | crontab -

    log "Automatic backup scheduled: $cron_schedule"
    echo -e "${GREEN}✅ Automatic backup scheduled${NC}"
    echo -e "${BLUE}💡 Backups will be created automatically${NC}"
}

# Function to show backup status
show_status() {
    echo -e "${BLUE}📊 Backup & Disaster Recovery Status${NC}"
    echo ""

    # Check backup directory
    if [[ -d "$BACKUP_DIR" ]]; then
        local backup_count=$(ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l)
        local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)

        echo -e "${BLUE}📦 Backup Directory: $BACKUP_DIR${NC}"
        echo -e "${BLUE}   Backups: $backup_count${NC}"
        echo -e "${BLUE}   Total size: $total_size${NC}"

        if [[ $backup_count -gt 0 ]]; then
            echo ""
            echo -e "${BLUE}📋 Recent Backups:${NC}"
            ls -la "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -5 | awk '{print "   " $6 " " $7 " " $8 " " $9}'
        fi
    else
        echo -e "${YELLOW}⚠️ Backup directory not found${NC}"
    fi

    echo ""

    # Check crontab
    echo -e "${BLUE}⏰ Scheduled Backups:${NC}"
    if crontab -l 2>/dev/null | grep -q "backup.sh"; then
        echo -e "${GREEN}✅ Automatic backup is scheduled${NC}"
        crontab -l 2>/dev/null | grep "backup.sh" | sed 's/^/   /'
    else
        echo -e "${YELLOW}⚠️ No automatic backup scheduled${NC}"
    fi

    echo ""

    # Check log file
    if [[ -f "$LOG_FILE" ]]; then
        local recent_logs=$(tail -5 "$LOG_FILE" 2>/dev/null)
        echo -e "${BLUE}📋 Recent Activity:${NC}"
        echo "$recent_logs" | sed 's/^/   /'
    fi

    echo ""

    # Show retention info
    echo -e "${BLUE}⏱️  Retention Policy:${NC}"
    echo -e "${BLUE}   Retention period: $RETENTION_DAYS days${NC}"
    echo -e "${BLUE}   Backup frequency: Automatic (if scheduled)${NC}"
    echo -e "${BLUE}   Backup type: Full${NC}"
}

# Main command handler
case "${1:-help}" in
    "backup")
        create_backup
        ;;
    "restore")
        restore_backup "$2"
        ;;
    "verify")
        verify_backup "$2"
        ;;
    "schedule")
        schedule_backup "$2"
        ;;
    "clean")
        clean_old_backups
        ;;
    "status")
        show_status
        ;;
    "test")
        echo -e "${YELLOW}🧪 Testing backup system...${NC}"
        create_backup
        sleep 2
        verify_backup "backup_${TIMESTAMP}"
        echo -e "${GREEN}✅ Backup system test completed${NC}"
        ;;
    "help"|"-h"|"--help")
        echo "Open Hivemind Backup & Disaster Recovery"
        echo ""
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  backup     Create a new backup"
        echo "  restore    Restore from a backup file"
        echo "  verify     Verify backup integrity"
        echo "  schedule   Schedule automatic backups"
        echo "  clean      Clean old backups"
        echo "  status     Show backup system status"
        echo "  test       Test backup system"
        echo "  help       Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 backup"
        echo "  $0 restore backup_20241004_120000.tar.gz"
        echo "  $0 verify backup_20241004_120000.tar.gz"
        echo "  $0 schedule '0 2 * * *'"
        echo "  $0 status"
        echo ""
        echo "Configuration:"
        echo "  Backup directory: $BACKUP_DIR"
        echo "  Retention period: $RETENTION_DAYS days"
        echo "  Log file: $LOG_FILE"
        echo ""
        echo "Backup items:"
        for item in "${BACKUP_CONFIG[@]}"; do
            echo "  - ${item#*:} (${item%%:*})"
        done
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        echo "Use '$0 help' to see available commands"
        exit 1
        ;;
esac