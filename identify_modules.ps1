
$word = New-Object -ComObject Word.Application
$files = Get-ChildItem 'C:\Users\piopi\Documents\gemini-projects\School programs\M*.doc*'
foreach ($file in $files) {
    try {
        $doc = $word.Documents.Open($file.FullName)
        $text = $doc.Content.Text
        
        $name = ""
        if ($text -match "Intitulé de l.unité de formation\s*:\s*([^\r\n]*)") {
            $name = $matches[1].Trim()
        }
        
        $moduleNum = ""
        if ($text -match "Module\s*:\s*(\d+)") {
            $moduleNum = $matches[1].Trim()
        }
        
        Write-Host "FILE: $($file.Name) | NAME: $name | MODULE_NUM: $moduleNum"
        
        $doc.Close([Microsoft.Office.Interop.Word.WdSaveOptions]::wdDoNotSaveChanges)
    } catch {
        Write-Host "ERROR processing $($file.Name): $($_.Exception.Message)"
    }
}
$word.Quit()
