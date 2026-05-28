import zipfile
import os

base = r"D:\demo\CrabWatch\web\.next\standalone"
zip_path = r"D:\demo\CrabWatch\crabwatch-web.zip"

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    count = 0
    for root, dirs, files in os.walk(base):
        for f in files:
            if f.endswith('.map'):
                continue
            full_path = os.path.join(root, f)
            arc_name = os.path.relpath(full_path, base)
            zipf.write(full_path, arc_name)
            count += 1

print(f"Done! Added {count} files")
print(f"Size: {os.path.getsize(zip_path) / (1024*1024):.2f} MB")
