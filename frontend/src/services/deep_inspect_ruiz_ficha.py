import pandas as pd

file_path = r"c:\Users\Parque-Apicola\Desktop\apicultor_srm\Ficha RUIZ RUBEN OSCAR (G.PICO).xlsx"

df = pd.read_excel(file_path, sheet_name='Ficha')
print("Columns in 'Ficha' sheet:")
print(df.columns.tolist())
print("\nFirst 40 rows:")
print(df.head(40).to_string())
