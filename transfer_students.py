import pandas as pd
import numpy as np

def clean_val(v):
    if pd.isna(v):
        return ""
    v = str(v).strip()
    if v == "──":
        return ""
    return v

def combine_vals(v1, v2):
    c1 = clean_val(v1)
    c2 = clean_val(v2)
    vals = [v for v in [c1, c2] if v]
    return ' / '.join(vals) if vals else ''

def run():
    df = pd.read_excel('students_export (4).xls', engine='openpyxl')
    
    df_new = pd.DataFrame()
    df_new['Full Name'] = df['FULL NAME'].apply(clean_val)
    df_new['Student ID'] = df['ID'].apply(clean_val)
    df_new['Class'] = df['CLASS'].apply(clean_val)
    df_new['Guardian'] = df.apply(lambda row: combine_vals(row['GUARDIAN'], row['GUARDIAN.1']), axis=1)
    df_new['Phone'] = df.apply(lambda row: combine_vals(row['PHONE'], row['PHONE.1']), axis=1)
    df_new['Email'] = df['EMAIL'].apply(clean_val)
    df_new['Address'] = df['STATUE'].apply(clean_val)
    df_new['Status'] = 'Active'
    df_new['Created'] = df['CREATED'].apply(clean_val)
    
    df_new.to_csv('students_export.csv', index=False)
    print("Transfer complete (with whitespace stripped).")

if __name__ == "__main__":
    run()
