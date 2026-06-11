import urllib.request
import re
import time
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://geo-srm.vercel.app/"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
}

print("Polling Vercel deployment... waiting for build update...")
found_new = False

for attempt in range(1, 10):
    try:
        poll_url = f"{url}?t={int(time.time())}"
        req = urllib.request.Request(poll_url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=8) as response:
            html = response.read().decode('utf-8')
            js_files = re.findall(r'src="/assets/(index-[a-zA-Z0-9_-]+\.js)"', html)
            if js_files:
                current_hash = js_files[0]
                print(f"Attempt {attempt}: Found bundle {current_hash}")
                
                # Fetch and check if the bundle contains the new feature text
                js_bundle_url = f"https://geo-srm.vercel.app/assets/{current_hash}"
                js_req = urllib.request.Request(js_bundle_url, headers=headers)
                with urllib.request.urlopen(js_req, context=ctx, timeout=8) as js_res:
                    js_content = js_res.read().decode('utf-8')
                    # Let's check for a key phrase that exists in our new refactoring
                    has_recoleccion = "Registrar Recolección" in js_content or "Registrar Recoleccion" in js_content
                    has_distribucion = "Registrar Distribución" in js_content or "Registrar Distribucion" in js_content
                    has_stats = "statsTambores" in js_content or "Clasificacion de Acopio" in js_content or "Clasificación de Acopio" in js_content
                    
                    print(f" -> Has Recolección: {has_recoleccion}")
                    print(f" -> Has Distribución: {has_distribucion}")
                    print(f" -> Has Stats Tambores: {has_stats}")
                    
                    if has_recoleccion and has_distribucion:
                        print("\n🎉 SUCCESS! Vercel is running the new refactored version!")
                        found_new = True
                        break
            else:
                print(f"Attempt {attempt}: No JS bundle found in HTML.")
    except Exception as e:
        print(f"Attempt {attempt}: Error:", e)
        
    time.sleep(10)

if not found_new:
    print("\nCould not confirm the new build on Vercel yet. Vercel may still be building.")
