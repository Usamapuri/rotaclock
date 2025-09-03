#!/usr/bin/env pwsh
# Test runner for debug mock test

Write-Host "Running debug mock test..." -ForegroundColor Green

try {
    $testOutput = npx jest __tests__/debug-mock.test.ts --no-cache --verbose 2>&1 | Out-String
    
    $testOutput | Out-File -FilePath "debug-test-results.txt" -Encoding UTF8
    
    Write-Host "Debug test completed. Output:" -ForegroundColor Green
    Write-Host $testOutput -ForegroundColor Cyan
    
} catch {
    Write-Host "Error running test: $_" -ForegroundColor Red
}

Write-Host "Done." -ForegroundColor Green
