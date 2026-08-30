with open(r'C:\Users\USER\OneDrive\Documents\GitHub\Cafeteria\frontend\js\admin.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
with open(r'C:\Users\USER\OneDrive\Documents\GitHub\Cafeteria\scripts\output.txt', 'w', encoding='utf-8') as out:
    for i, line in enumerate(lines):
        if 520 <= i+1 <= 550:
            out.write(f'{i+1}: {line.rstrip()}\n')