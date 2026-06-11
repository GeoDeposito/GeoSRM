import urllib.request
import urllib.error
import json

anon_key = "sb_publishable_bYlB4bsuJyv7nMOUXrsRew_ubUacX2Q"
url = "https://ajrfkkiuludrdexgprmb.supabase.co/rest/v1/ficha_cuenta_corriente?select=tcp"

headers = {
    "apikey": anon_key,
    "Authorization": f"Bearer {anon_key}",
    "Content-Type": "application/json"
}

req = urllib.request.Request(url, headers=headers, method='GET')
try:
    with urllib.request.urlopen(req) as response:
        print("Success:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}:")
    print(e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
