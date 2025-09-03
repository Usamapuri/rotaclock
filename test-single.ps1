#!/usr/bin/env pwsh
# Test runner for single file

Write-Host "Running single test file..." -ForegroundColor Green

try {
    $testOutput = npx jest __tests__/simple.test.ts --no-cache --verbose 2>&1 | Out-String
    
    $testOutput | Out-File -FilePath "single-test-results.txt" -Encoding UTF8
    
    Write-Host "Single test completed. Output:" -ForegroundColor Green
    Write-Host $testOutput -ForegroundColor Cyan
    
} catch {
    Write-Host "Error running test: $_" -ForegroundColor Red
}

Write-Host "Done." -ForegroundColor Green
