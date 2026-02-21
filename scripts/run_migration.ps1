<#
PowerShell helper: run a SQL migration file against your Postgres/Supabase DB.
Usage (PowerShell):
  $env:PG_CONN = 'postgresql://user:password@db.host:5432/database'
  .\scripts\run_migration.ps1 -SqlFile 'supabase/migrations/2026-02-21-make-manufacturing-recipes-independent.sql'

Notes:
- Requires `psql` (Postgres client) in PATH. On Windows you can install via PostgreSQL installer, or use the Supabase CLI's psql if available.
- Do NOT share credentials here. Run locally with your service-role connection string or a DB user that can run migrations.
#>
param(
    [string]$SqlFile = "supabase/migrations/2026-02-21-make-manufacturing-recipes-independent.sql"
)
$pg = $env:PG_CONN
if (-not $pg) {
    Write-Error "Environment variable PG_CONN is not set. Set PG_CONN to your Postgres connection string (postgresql://user:pass@host:port/db)."
    exit 1
}
if (-not (Test-Path $SqlFile)) {
    Write-Error "SQL file not found: $SqlFile"
    exit 2
}
Write-Host "Running migration file: $SqlFile against $($pg.split('@')[-1])"
$proc = Start-Process -FilePath psql -ArgumentList @($pg, '-f', $SqlFile) -NoNewWindow -Wait -PassThru
if ($proc.ExitCode -eq 0) {
    Write-Host "Migration applied successfully." -ForegroundColor Green
    exit 0
} else {
    Write-Error "psql exited with code $($proc.ExitCode). Check output above for errors." -ForegroundColor Red
    exit $proc.ExitCode
}
