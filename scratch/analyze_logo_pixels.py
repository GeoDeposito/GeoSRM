import os
from PIL import Image

backup_path = r"c:\Users\Parque-Apicola\Desktop\apicultor_srm\frontend\public\logo-geomiel-backup.png"
img = Image.open(backup_path).convert("RGBA")
width, height = img.size

# Let's inspect the opacity or color of each row
# A row is considered empty if all pixels are transparent (alpha=0) or white (R=255, G=255, B=255)
for y in range(height):
    row_pixels = [img.getpixel((x, y)) for x in range(width)]
    non_white_non_trans = []
    for p in row_pixels:
        r, g, b, a = p
        # Check if pixel is not white and not transparent
        if a > 10 and not (r > 240 and g > 240 and b > 240):
            non_white_non_trans.append(p)
    
    if len(non_white_non_trans) > 0:
        print(f"Row {y:2d}: {len(non_white_non_trans):3d} colored pixels")
    else:
        print(f"Row {y:2d}: EMPTY")
