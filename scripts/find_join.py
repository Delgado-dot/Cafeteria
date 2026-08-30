with open(r'C:\Users\USER\OneDrive\Documents\GitHub\Cafeteria\frontend\js\admin.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'join' in line and 535 <= i+1 <= 550:
        print(f'Line {i+1}: {line.rstrip()}')