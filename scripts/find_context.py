with open(r'C:\Users\USER\OneDrive\Documents\GitHub\Cafeteria\frontend\js\admin.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 520 <= i+1 <= 550:
        print(f'{i+1}: {line.rstrip()}')