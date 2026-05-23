import json
import os

article = os.environ.get('ARTICLE', 'Unbekannt')
comment = os.environ.get('COMMENT', 'Leer')

data = []

try:
    with open('comments.json', 'r') as f:
        data = json.load(f)
except:
    pass

data.append({
    'article': article,
    'comment': comment
})

with open('comments.json', 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'Gespeichert: {article}')
