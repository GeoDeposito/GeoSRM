import pandas as pd

file_path = r"c:\Users\Parque-Apicola\Desktop\apicultor_srm\Ficha RUIZ RUBEN OSCAR (G.PICO).xlsx"

df = pd.read_excel(file_path, sheet_name='Ficha')
# Clean and print rows from 22 to 80
print("--- Ruiz Ledger Rows (22 to 80) ---")
print(df.iloc[21:80, :14].to_string())
