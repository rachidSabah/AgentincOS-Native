
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

function Update-ModuleFile($filePath, $sessions) {
    Write-Host "Updating ${filePath} with $($sessions.Count) sessions..."
    try {
        $doc = $word.Documents.Open($filePath)
        $table = $doc.Tables.Item(1)
        
        $totalDuration = 60
        # Try to find duration
        try {
            $durationCell = $table.Cell(3, 4)
            if ($durationCell.Range.Text -match "Durée\s*:\s*(\d+)") {
                $totalDuration = [int]$matches[1]
            }
        } catch {}

        $startRow = 5
        $cumulativeHours = 0.0
        
        for ($i = 0; $i -lt $sessions.Count; $i++) {
            $rowIdx = $startRow + $i
            $session = $sessions[$i]
            
            # Ensure row exists
            try {
                $cell = $table.Cell($rowIdx, 1)
                $text = $cell.Range.Text
                if ($text -match "Taux de réalisation" -or $text -match "Commentaire") {
                    $cell.Select()
                    $word.Selection.InsertRowsAbove(1)
                }
            } catch {
                # Row doesn't exist, try to find footer and insert before it
                $foundFooter = $false
                for ($r = $rowIdx; $r -lt 100; $r++) {
                    try {
                        $t = $table.Cell($r, 1).Range.Text
                        if ($t -match "Taux de réalisation" -or $t -match "Commentaire") {
                            $table.Cell($r, 1).Select()
                            $word.Selection.InsertRowsAbove(1)
                            $foundFooter = $true
                            break
                        }
                    } catch {
                        # Table ended
                        try {
                            $table.Rows.Add()
                            $foundFooter = $true
                            break
                        } catch { break }
                    }
                }
            }

            # Update cells
            try {
                # Date & Time
                $table.Cell($rowIdx, 1).Range.Text = $session.DateTime
                
                # Objective
                try {
                    $existingObj = $table.Cell($rowIdx, 2).Range.Text.Trim().Replace("`r", "").Replace("`n", "").Replace("`a", "")
                    if ($existingObj.Length -lt 5) {
                        $table.Cell($rowIdx, 2).Range.Text = $session.Objective
                    }
                } catch {
                    $table.Cell($rowIdx, 2).Range.Text = $session.Objective
                }
                
                # Hours
                $table.Cell($rowIdx, 6).Range.Text = "$($session.Hours)h"
                
                # Cumulative
                $cumulativeHours += $session.Hours
                $h = [int]$cumulativeHours
                $m = [int](($cumulativeHours - $h) * 60)
                $table.Cell($rowIdx, 7).Range.Text = "{0:D2}h{1:D2}" -f $h, $m
            } catch {
                Write-Host "  Error updating row ${rowIdx}: $($_.Exception.Message)"
            }
        }

        # Update Taux
        for ($r = $startRow + $sessions.Count; $r -le $table.Rows.Count; $r++) {
            try {
                if ($table.Cell($r, 1).Range.Text -match "Taux de réalisation") {
                    $taux = [int](($cumulativeHours / $totalDuration) * 100)
                    $table.Cell($r, 2).Range.Text = "$taux%"
                    break
                }
            } catch {}
        }

        $doc.Save()
        $doc.Close()
        Start-Sleep -Seconds 1
    } catch {
        Write-Host "Error processing ${filePath}: $($_.Exception.Message)"
    }
}

# Example sessions for M5
$m5Sessions = @(
    [PSCustomObject]@{DateTime="07 Jul 2025 13h-16h"; Objective="Comportements et attitudes professionnels (C.T)"; Hours=3},
    [PSCustomObject]@{DateTime="08 Jul 2025 13h-16h"; Objective="Comportements et attitudes professionnels (C.P)"; Hours=3},
    [PSCustomObject]@{DateTime="09 Jul 2025 13h-16h"; Objective="Comportements et attitudes professionnels (C.P)"; Hours=3},
    [PSCustomObject]@{DateTime="10 Jul 2025 13h-16h"; Objective="Comportements et attitudes professionnels (C.P)"; Hours=3},
    [PSCustomObject]@{DateTime="11 Jul 2025 13h-16h"; Objective="Comportements et attitudes professionnels (C.P)"; Hours=3},
    [PSCustomObject]@{DateTime="14 Jul 2025 13h-16h"; Objective="Comportements et attitudes professionnels (C.P)"; Hours=3},
    [PSCustomObject]@{DateTime="16 Jul 2025 13h-16h"; Objective="Comportements et attitudes professionnels (C.T)"; Hours=3},
    [PSCustomObject]@{DateTime="17 Jul 2025 13h-16h"; Objective="Comportements et attitudes professionnels (C.T)"; Hours=3},
    [PSCustomObject]@{DateTime="18 Jul 2025 13h-16h"; Objective="Comportements et attitudes professionnels (C.T)"; Hours=3},
    [PSCustomObject]@{DateTime="21 Jul 2025 09h-12h"; Objective="Comportements et attitudes professionnels (C.C)"; Hours=3},
    [PSCustomObject]@{DateTime="22 Jul 2025 09h-12h"; Objective="Comportements et attitudes professionnels (C.T)"; Hours=3},
    [PSCustomObject]@{DateTime="23 Jul 2025 09h-12h"; Objective="Comportements et attitudes professionnels (C.P)"; Hours=3},
    [PSCustomObject]@{DateTime="24 Jul 2025 09h-12h"; Objective="Comportements et attitudes professionnels (C.C)"; Hours=3},
    [PSCustomObject]@{DateTime="25 Jul 2025 09h-12h"; Objective="Comportements et attitudes professionnels (C.P)"; Hours=3},
    [PSCustomObject]@{DateTime="28 Jul 2025 09h-12h"; Objective="Comportements et attitudes professionnels (C.P)"; Hours=3},
    [PSCustomObject]@{DateTime="29 Jul 2025 09h-12h"; Objective="Comportements et attitudes professionnels (C.C)"; Hours=3},
    [PSCustomObject]@{DateTime="31 Jul 2025 09h-12h"; Objective="Comportements et attitudes professionnels (C.P)"; Hours=3},
    [PSCustomObject]@{DateTime="01 Aou 2025 09h-12h"; Objective="Comportements et attitudes professionnels (C.T)"; Hours=3},
    [PSCustomObject]@{DateTime="02 Aou 2025 09h-12h"; Objective="Comportements et attitudes professionnels (C.T)"; Hours=3}
)

Update-ModuleFile "C:\Users\piopi\Documents\gemini-projects\School programs\M5.doc" $m5Sessions

$word.Quit()
