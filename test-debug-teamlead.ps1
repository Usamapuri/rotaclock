#!/usr/bin/env pwsh
# Test runner for debug team lead test

Write-Host "Running debug team lead test..." -ForegroundColor Green

try {
    $testOutput = npx jest __tests__/debug-teamlead.test.ts --no-cache --verbose 2>&1 | Out-String
    
    $testOutput | Out-File -FilePath "debug-teamlead-results.txt" -Encoding UTF8
    
    Write-Host "Debug team lead test completed. Output:" -ForegroundColor Green
    Write-Host $testOutput -ForegroundColor Cyan
    
} catch {
    Write-Host "Error running test: $_" -ForegroundColor Red
}

Write-Host "Done." -ForegroundColor Green
