
$word = New-Object -ComObject Word.Application
try {
    $doc = $word.Documents.Open('C:\Users\piopi\Documents\gemini-projects\School programs\M5.doc')
    $table = $doc.Tables.Item(1)
    for ($i = 1; $i -le $table.Rows.Count; $i++) {
        $rowText = ""
        for ($j = 1; $j -le $table.Columns.Count; $j++) {
            try {
                $cellText = $table.Cell($i, $j).Range.Text.Trim().Replace("`r", " ").Replace("`n", " ").Replace("`a", "")
                $rowText += $cellText + " | "
            } catch {
                $rowText += "[SKIP] | "
            }
        }
        Write-Host "ROW ${i}: $rowText"
    }
    $doc.Close()
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}
$word.Quit()
