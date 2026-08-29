# PAIOS 5.0 (Personal AI Operating System)

## Deployment & Production PM2 Operations (Ubuntu Server)

### PM2 Process Descriptor
Run the backend server using PM2 with auto-restart on crash and 1GB memory limits:
```bash
pm2 start ecosystem.config.cjs --env production
```

### Database Maintenance & Automated Backups
To perform an online atomic backup of the SQLite database:
```bash
sqlite3 ./data/paios5.sqlite ".backup './backups/paios5_$(date +%F).sqlite'"
```

Or run the automated backup script:
```bash
./scripts/backup-db.sh
```

To schedule daily backups at 02:00 AM via `crontab -e`:
```cron
0 2 * * * /var/www/paios/scripts/backup-db.sh > /dev/null 2>&1
```

### Local Reset Script
To safely reset the SQLite database and clean temporary WAL/SHM files:
```bash
npm run db:reset
```

### Testing & Verification
```bash
npm run test          # Run all Vitest suites in CI mode
npm run test:atdd     # Run ATDD integration suite
npm run test:unit     # Run unit test suite
```
