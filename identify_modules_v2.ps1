
$word = New-Object -ComObject Word.Application
$files = Get-ChildItem 'C:\Users\piopi\Documents\gemini-projects\School programs\M*.doc*'
foreach ($file in $files) {
    try {
        $doc = $word.Documents.Open($file.FullName)
        $text = $doc.Content.Text
        
        $name = ""
        # Try different patterns for module name
        if ($text -match "Intitulé de l.unité de formation\s*:\s*([^\r\n]*)") {
            $name = $matches[1].Trim()
        } elseif ($text -match "Module\s*\d+\s*:\s*([^\r\n]*)") {
             $name = $matches[1].Trim()
        }
        
        $moduleNum = ""
        if ($text -match "Module\s*:\s*(\d+)") {
            $moduleNum = $matches[1].Trim()
        } elseif ($file.Name -match "M(\d+)") {
             $moduleNum = $matches[1]
        }
        
        $snippet = $text.Substring(0, [Math]::Min(200, $text.Length)).Replace("`r", " ").Replace("`n", " ")
        
        Write-Host "FILE: $($file.Name) | NUM: $moduleNum | NAME: $name | SNIPPET: $snippet"
        
        $doc.Close([Microsoft.Office.Interop.Word.WdSaveOptions]::wdDoNotSaveChanges)
    } catch {
        Write-Host "ERROR processing $($file.Name): $($_.Exception.Message)"
    }
}
$word.Quit()
