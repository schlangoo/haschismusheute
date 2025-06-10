const RSS_FEEDS = {
    deutschlandfunk: "https://www.deutschlandfunk.de/nachrichten-100.rss",
    jungewelt: "https://www.jungewelt.de/feeds/newsticker.rss",
    aljazeera: "https://www.aljazeera.com/xml/rss/all.xml",
    un: "https://news.un.org/feed/subscribe/en/news/all/rss.xml",
    multipolar: "https://multipolar-magazin.de/atom-artikel.xml"
};

// Verbesserte Übersetzungsfunktion mit Timeout & Fehlerbehandlung
async function translateText(text, targetLang = 'de') {
    if (!text) return text;
    
    // Fallback: Wenn Übersetzung zu lange dauert (>3 Sekunden), abbrechen
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    try {
        const response = await fetch('https://libretranslate.de/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                q: text,
                source: 'en',
                target: targetLang,
                format: 'text'
            }),
            signal: controller.signal
        });
        
        if (!response.ok) throw new Error("API-Fehler");
        const data = await response.json();
        return data.translatedText || text;
        
    } catch (error) {
        console.warn("Übersetzung fehlgeschlagen, verwende Originaltext:", error);
        return text; // Wichtig: Immer Fallback zurückgeben
    } finally {
        clearTimeout(timeout);
    }
}

async function loadFeed(feedKey, initialLoad = false) {
    if (!initialLoad) {
        document.querySelectorAll('.feed-selector button').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
    }
    
    const feedUrl = RSS_FEEDS[feedKey];
    try {
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`);
        const data = await response.json();
        
        let feedHTML = "";
        if (data.items?.length > 0) {
            // Übersetzung nur für Al Jazeera & UN versuchen
            const needsTranslation = (feedKey === 'aljazeera' || feedKey === 'un');
            
            for (const item of data.items) {
                let title = item.title;
                let description = item.description.replace(/<[^>]*>/g, "").substring(0, 400) + "...";

                // Übersetzung parallel anstoßen (nicht auf Ergebnis warten)
                if (needsTranslation) {
                    translateText(title).then(translated => {
                        title = translated;
                    }).catch(() => null); // Fehler ignorieren
                    
                    translateText(description).then(translated => {
                        description = translated;
                    }).catch(() => null);
                }

                feedHTML += `
                    <div class="feed-item">
                        <h3><a href="${item.link}" target="_blank">${title}</a></h3>
                        <p>${description}</p>
                        <small>${new Date(item.pubDate).toLocaleString()}</small>
                    </div>
                `;
            }
        } else {
            feedHTML = `<p class="no-articles">Keine Artikel gefunden.</p>`;
        }
        
        document.getElementById("feed-content").innerHTML = feedHTML;
    } catch (error) {
        console.error("Feed-Lade-Fehler:", error);
        document.getElementById("feed-content").innerHTML = 
            `<p class="error">Fehler beim Laden. <button onclick="loadFeed('${feedKey}')">Erneut versuchen</button></p>`;
    }
}

// Initialer Aufruf
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.feed-selector button:first-child').classList.add('active');
    loadFeed('deutschlandfunk', true);
});
