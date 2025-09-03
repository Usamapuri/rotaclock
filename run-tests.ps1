#!/usr/bin/env pwsh
# Test runner script to capture Jest output

Write-Host "Starting Jest test run..." -ForegroundColor Green

# Run Jest and capture output
try {
    Write-Host "Running npm test..." -ForegroundColor Yellow
    $testOutput = npm test 2>&1 | Out-String
    
    # Save output to file
    $testOutput | Out-File -FilePath "test-results.txt" -Encoding UTF8
    
    Write-Host "Test completed. Output saved to test-results.txt" -ForegroundColor Green
    Write-Host "First 50 lines of output:" -ForegroundColor Cyan
    
    # Show first 50 lines
    $lines = $testOutput -split "`n"
    $lines[0..49] | ForEach-Object { Write-Host $_ }
    
    if ($lines.Length -gt 50) {
        Write-Host "... (truncated, see test-results.txt for full output)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "Error running tests: $_" -ForegroundColor Red
    $_.Exception.Message | Out-File -FilePath "test-error.txt" -Encoding UTF8
}

Write-Host "Done." -ForegroundColor Green
