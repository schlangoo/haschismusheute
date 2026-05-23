import json
import os
import requests
from datetime import datetime

# Authentifizierung
GITHUB_TOKEN = os.environ['GITHUB_TOKEN']
REPO = os.environ['REPO']
HEADERS = {
    'Authorization': f'Bearer {GITHUB_TOKEN}',
    'Accept': 'application/vnd.github.v3+json'
}

def get_labeled_issues():
    """Holt alle Issues mit Label 'kommentar'"""
    url = f'https://api.github.com/repos/{REPO}/issues'
    params = {
        'labels': 'kommentar',
        'state': 'open',
        'per_page': 100
    }
    response = requests.get(url, headers=HEADERS, params=params)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Fehler beim Abrufen: {response.status_code}")
        return []

def extract_comment(issue):
    """Extrahiert Daten aus dem Issue"""
    body = issue.get('body', '')
    
    artikel_id = None
    kommentar_text = ""
    
    for line in body.split('\n'):
        line = line.strip()
        if line.startswith('*Artikel-ID:'):
            artikel_id = line.replace('*Artikel-ID:', '').strip()
        elif line.startswith('**Kommentar:**'):
            # Nimm alles nach "**Kommentar:**"
            kommentar_text = line.replace('**Kommentar:**', '').strip()
    
    # Fallback: Aus Titel extrahieren
    if not artikel_id:
        title = issue.get('title', '')
        if 'Kommentar:' in title:
            artikel_id = title.split('Kommentar:')[1].strip()
    
    # Wenn noch kein Kommentar gefunden, nimm den ganzen Body
    if not kommentar_text:
        # Einfach alles nach der ersten Leerzeile
        parts = body.split('\n\n')
        if len(parts) > 1:
            kommentar_text = parts[-1].strip()
    
    return artikel_id, kommentar_text

def update_comments_json(artikel_id, kommentar_text):
    """Aktualisiert comments.json"""
    comments = []
    if os.path.exists('comments.json'):
        with open('comments.json', 'r', encoding='utf-8') as f:
            try:
                comments = json.load(f)
            except:
                comments = []
    
    # Neuer Kommentar
    neuer_kommentar = {
        'id': int(datetime.now().timestamp() * 1000),
        'text': kommentar_text,
        'date': datetime.now().isoformat(),
        'articleTitle': 'Aus Issue',
        'articleLink': ''
    }
    
    # Existierenden Artikel finden oder neuen erstellen
    for article in comments:
        if article.get('id') == artikel_id:
            if 'comments' not in article:
                article['comments'] = []
            article['comments'].append(neuer_kommentar)
            break
    else:
        comments.append({
            'id': artikel_id,
            'title': 'Aus Issue',
            'link': '',
            'summary': '',
            'originalDate': datetime.now().isoformat(),
            'comments': [neuer_kommentar]
        })
    
    with open('comments.json', 'w', encoding='utf-8') as f:
        json.dump(comments, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Kommentar zu Artikel {artikel_id} gespeichert")

def close_issue(issue_number):
    """Schließt das Issue"""
    url = f'https://api.github.com/repos/{REPO}/issues/{issue_number}'
    response = requests.patch(url, headers=HEADERS, json={'state': 'closed'})
    if response.status_code == 200:
        print(f"🗑️ Issue #{issue_number} geschlossen")
    else:
        print(f"⚠️ Konnte Issue #{issue_number} nicht schließen")

def main():
    print("🤖 Genosse Bot startet...")
    issues = get_labeled_issues()
    print(f"📋 {len(issues)} Issues gefunden")
    
    for issue in issues:
        print(f"🔍 Verarbeite Issue #{issue['number']}: {issue['title']}")
        artikel_id, kommentar_text = extract_comment(issue)
        
        if artikel_id and kommentar_text:
            print(f"   Artikel: {artikel_id}")
            print(f"   Kommentar: {kommentar_text[:50]}...")
            update_comments_json(artikel_id, kommentar_text)
            close_issue(issue['number'])
        else:
            print(f"   ⚠️ Konnte Daten nicht extrahieren")
    
    print("🎉 Fertig!")

if __name__ == '__main__':
    main()
