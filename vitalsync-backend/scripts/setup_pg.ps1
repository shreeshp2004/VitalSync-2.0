# VitalSync — PostgreSQL Portable Setup Script
# Run this AFTER pg16.zip finishes downloading to C:\temp\pg16.zip

$PG_DIR    = "C:\pgsql16"
$DATA_DIR  = "C:\pgdata"
$PG_PORT   = 5432
$PG_PASS   = "vitalsync2025"
$DB_NAME   = "vitalsync"
$PG_BIN    = "$PG_DIR\bin"

Write-Host "📦 Setting up portable PostgreSQL 16..."

# 1. Extract ZIP
if (-not (Test-Path $PG_DIR)) {
    Write-Host "  Extracting pg16.zip to $PG_DIR ..."
    Expand-Archive -Path "C:\temp\pg16.zip" -DestinationPath "C:\" -Force
    Rename-Item -Path "C:\pgsql" -NewName "pgsql16" -ErrorAction SilentlyContinue
    if (-not (Test-Path "$PG_DIR\bin\pg_ctl.exe")) {
        # ZIP may have extracted to C:\pgsql
        if (Test-Path "C:\pgsql\bin\pg_ctl.exe") {
            $PG_DIR = "C:\pgsql"
            $PG_BIN = "$PG_DIR\bin"
        }
    }
    Write-Host "  ✅ Extracted"
}

# 2. Init data directory
if (-not (Test-Path $DATA_DIR)) {
    Write-Host "  Initializing database cluster at $DATA_DIR ..."
    New-Item -ItemType Directory -Force -Path $DATA_DIR | Out-Null
    & "$PG_BIN\initdb.exe" -D $DATA_DIR -U postgres --pwfile=- <<< $PG_PASS 2>&1
    Write-Host "  ✅ Cluster initialized"
}

# 3. Start PostgreSQL
Write-Host "  Starting PostgreSQL..."
& "$PG_BIN\pg_ctl.exe" start -D $DATA_DIR -l "C:\pgdata\pg.log" -o "-p $PG_PORT"
Start-Sleep -Seconds 3

# 4. Create database
Write-Host "  Creating '$DB_NAME' database..."
$env:PGPASSWORD = $PG_PASS
& "$PG_BIN\createdb.exe" -U postgres -p $PG_PORT $DB_NAME 2>&1
Write-Host "  ✅ Database '$DB_NAME' created"

# 5. Update .env file
$ENV_FILE = "d:\Sheeeeeeeeeeeeeeesh\VitalSync 2.0\vitalsync-backend\.env"
$DB_URL   = "postgresql://postgres:$PG_PASS@localhost:$PG_PORT/$DB_NAME"
(Get-Content $ENV_FILE) -replace "DATABASE_URL=.*", "DATABASE_URL=$DB_URL" | Set-Content $ENV_FILE
Write-Host "  ✅ Updated .env: DATABASE_URL=$DB_URL"
Write-Host ""
Write-Host "🚀 Now run: cd 'd:\Sheeeeeeeeeeeeeeesh\VitalSync 2.0\vitalsync-backend' && node scripts/migrate.js && npm run dev"
