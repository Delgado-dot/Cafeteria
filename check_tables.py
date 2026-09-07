import os
import sys
sys.path.insert(0, r'C:\Users\USER\OneDrive\Documents\GitHub\Cafeteria\backend')
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()
from django.db import connection
cursor = connection.cursor()
cursor.execute('SELECT name FROM sqlite_master WHERE type="table"')
for t in cursor.fetchall():
    print(t[0])