import urllib.request
import pandas as pd
import io

# Original link
url = "https://geomiel.sharepoint.com/:x:/s/GeomielPrueba/IQAb-6mMmJbQTqksf4Zg2f3BARZ6-CXC_U2B6Yl93wACWCU?download=1"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
}

print("Trying to download Excel from SharePoint...")
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        content = response.read()
        print(f"Downloaded {len(content)} bytes.")
        
        # Try to parse with pandas
        df = pd.read_excel(io.BytesIO(content))
        print("Excel parsed successfully!")
        print("Columns:", list(df.columns))
        print("First 5 rows:")
        print(df.head(5))
except Exception as e:
    print("Error:", e)
