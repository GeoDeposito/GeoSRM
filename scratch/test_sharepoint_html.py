import urllib.request

url = "https://geomiel.sharepoint.com/:x:/s/GeomielPrueba/IQAb-6mMmJbQTqksf4Zg2f3BARZ6-CXC_U2B6Yl93wACWCU?download=1"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        content = response.read()
        print("First 1000 characters:")
        print(content[:1000].decode('utf-8', errors='ignore'))
except Exception as e:
    print("Error:", e)
