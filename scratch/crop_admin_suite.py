import os
from PIL import Image

logo_path = r"c:\Users\Parque-Apicola\Desktop\apicultor_srm\frontend\public\logo-geomiel.png"
backup_path = r"c:\Users\Parque-Apicola\Desktop\apicultor_srm\frontend\public\logo-geomiel-backup.png"

try:
    if not os.path.exists(backup_path):
        img = Image.open(logo_path)
        img.save(backup_path)
        print("Backup created.")
    else:
        img = Image.open(backup_path)
        print("Using existing backup.")
        
    width, height = img.size
    print(f"Original size: {width}x{height}")
    
    # Let's crop only the top part. Let's see how much height we should keep.
    # Looking at the screenshot, the "geomiel" word and hexagon are at the top,
    # and "ADMIN EXECUTIVE SUITE" is at the bottom.
    # Let's crop the top 50% of the image height, or let's inspect where pixels are.
    # Let's keep the top 55% of the height.
    new_height = int(height * 0.55)
    cropped_img = img.crop((0, 0, width, new_height))
    cropped_img.save(logo_path)
    print(f"Saved cropped logo: {width}x{new_height}")
    
except Exception as e:
    print("Error:", e)
