from PIL import Image

backup_path = r"c:\Users\Parque-Apicola\Desktop\apicultor_srm\frontend\public\logo-geomiel-backup.png"
logo_path = r"c:\Users\Parque-Apicola\Desktop\apicultor_srm\frontend\public\logo-geomiel.png"

img = Image.open(backup_path)
width, height = img.size

# We saw that geomiel colored pixels go down to row 75.
# Let's crop from y=0 to y=76 to keep the full logo.
cropped_img = img.crop((0, 0, width, 76))
cropped_img.save(logo_path)
print(f"Saved logo cropped to 76px height. Size is {width}x76")
