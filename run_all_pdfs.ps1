# run_all_pdfs.ps1
# Processes all unprocessed PDFs one at a time, each in a fresh Python process.
# Safe to re-run - already-processed PDFs are skipped automatically.

Set-Location "c:\Users\Asus\exam-practice"

$pdfs = Get-ChildItem "extracted_data\*_qp_*.pdf" | Sort-Object Name

foreach ($pdf in $pdfs) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Running: $($pdf.Name)" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan

    python -u scripts\python\process_one_pdf.py $pdf.Name

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Exited with code $LASTEXITCODE - skipping to next" -ForegroundColor Red
    }

    Start-Sleep -Seconds 5
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "All PDFs attempted." -ForegroundColor Green
python -u scripts\python\summarize_progress.py
