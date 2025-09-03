#!/usr/bin/env pwsh
# Test runner for team lead tests

Write-Host "Running team lead test..." -ForegroundColor Green

try {
    $testOutput = npx jest __tests__/api/team-lead/leave-requests.test.ts --no-cache --verbose 2>&1 | Out-String
    
    $testOutput | Out-File -FilePath "teamlead-test-results.txt" -Encoding UTF8
    
    Write-Host "Team lead test completed. Output:" -ForegroundColor Green
    Write-Host $testOutput -ForegroundColor Cyan
    
} catch {
    Write-Host "Error running test: $_" -ForegroundColor Red
}

Write-Host "Done." -ForegroundColor Green
