import pandas as pd
import os

file_path = r"c:\Users\Parque-Apicola\Desktop\apicultor_srm\Ficha RUIZ RUBEN OSCAR (G.PICO).xlsx"

print("Checking file path exists:", os.path.exists(file_path))

try:
    xl = pd.ExcelFile(file_path)
    print("Sheets in Excel file:", xl.sheet_names)
    for sheet in xl.sheet_names:
        print(f"\n--- Sheet: {sheet} ---")
        # Load the sheet
        df = pd.read_excel(file_path, sheet_name=sheet)
        print("Shape:", df.shape)
        print("Columns:", df.columns.tolist()[:10])
        # Print first 10 rows
        print(df.head(10).to_string())
except Exception as e:
    print("Error:", e)
