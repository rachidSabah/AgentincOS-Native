import re

def parse_modules(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract summary info first
    # Use a more robust pattern for ATAM code
    summary_pattern = r'(ATAM\s*.*?\s*(\d+))\s+\2\s+(.*?)\s+(\d+)\s+(\d+)'
    summaries = re.findall(summary_pattern, content)
    
    # Extract detailed descriptions
    details = {}
    parts = re.split(r'MODULE\s+\d+\s*:', content)
    for part in parts[1:]:
        code_match = re.search(r'Code\s*:\s*(ATAM\s*\d+)', part)
        if code_match:
            code_num = re.search(r'(\d+)', code_match.group(1)).group(1)
            code = f"ATAM-{code_num.zfill(2)}"
            
            desc_match = re.search(r'Pour d├®montrer sa comp├®tence, le stagiaire doit\s+(.*?)\s+selon les conditions', part, re.DOTALL)
            if not desc_match:
                 # Try without weird char
                 desc_match = re.search(r'Pour démontrer sa compétence, le stagiaire doit\s+(.*?)\s+selon les conditions', part, re.DOTALL)
            
            if desc_match:
                description = desc_match.group(1).strip().replace('\n', ' ')
                details[code] = description

    # Merge
    results = []
    for code_raw, num_str, name, hours, units in summaries:
        num = int(num_str)
        code = f"ATAM-{num_str.zfill(2)}"
        
        # Determine Year and Semester (heuristic)
        if num <= 13:
            year = 1
            semester = 1 if num <= 6 else 2
        else:
            year = 2
            semester = 1 if num <= 18 else 2
            
        desc = details.get(code, "Description not found")
        results.append({
            'Name': name.strip(),
            'Code': code,
            'Year': year,
            'Semester': semester,
            'Hours': hours,
            'Description': desc
        })
    
    return results

if __name__ == "__main__":
    modules = parse_modules('pdf_text.txt')
    import csv
    with open('modules_export.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['Module Name', 'Code', 'Year', 'Semester', 'Hours', 'Description'])
        writer.writeheader()
        for mod in modules:
            writer.writerow({
                'Module Name': mod['Name'],
                'Code': mod['Code'],
                'Year': mod['Year'],
                'Semester': mod['Semester'],
                'Hours': mod['Hours'],
                'Description': mod['Description']
            })
    print(f"Generated modules_export.csv with {len(modules)} modules.")
