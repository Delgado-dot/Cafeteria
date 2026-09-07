with open(r'C:\Users\USER\OneDrive\Documents\GitHub\Cafeteria\frontend\js\admin.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix corrupted em dash (replacement char U+FFFD) to proper em dash
content = content.replace("o.time || '\ufffd'", "o.time || '—'")

with open(r'C:\Users\USER\OneDrive\Documents\GitHub\Cafeteria\frontend\js\admin.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed em dash in sales-history')