
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$files = Get-ChildItem 'C:\Users\piopi\Documents\gemini-projects\School programs\*.doc'
foreach ($file in $files) {
    if ($file.Extension -eq ".doc") {
        Write-Host "Converting $($file.FullName) to .docx"
        try {
            $doc = $word.Documents.Open($file.FullName)
            $newPath = $file.FullName + "x"
            $doc.SaveAs2($newPath, 16) # wdFormatXMLDocument
            $doc.Close()
            Write-Host "  Saved as $newPath"
        } catch {
            Write-Host "  Error converting $($file.Name): $($_.Exception.Message)"
        }
    }
}
$word.Quit()
