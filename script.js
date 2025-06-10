const RSS_FEEDS = {
    deutschlandfunk: "https://www.deutschlandfunk.de/nachrichten-100.rss",
    jungewelt: "https://www.jungewelt.de/feeds/newsticker.rss",
    aljazeera: "https://www.aljazeera.com/xml/rss/all.xml",
    un: "https://news.un.org/feed/subscribe/en/news/all/rss.xml",
    multipolar: "https://multipolar-magazin.de/atom-artikel.xml"
};

// Übersetzungsfunktion (nutzt LibreTranslate)
async function translateText(text, targetLang = 'de') {
    try {
        const response = await fetch('https://libretranslate.de/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                q: text,
                source: 'en',
                target: targetLang,
                format: 'text'
            })
        });
        const data = await response.json();
        return data.translatedText || text; // Falls Fehler, Originaltext zurückgeben
    } catch (error) {
        console.error("Übersetzungsfehler:", error);
        return text; // Fallback: Unübersetzter Text
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
        if (data.items && data.items.length > 0) {
            for (const item of data.items) { // "for...of" für async/await
                let title = item.title;
                let description = item.description.replace(/<[^>]*>/g, "").substring(0, 400) + "...";

                // Übersetze Titel & Beschreibung bei Al Jazeera & UN
                if (feedKey === 'aljazeera' || feedKey === 'un') {
                    title = await translateText(title);
                    description = await translateText(description);
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
        console.error("Fehler:", error);
        document.getElementById("feed-content").innerHTML = 
            `<p class="error">Fehler beim Laden. Bitte später versuchen.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.feed-selector button:first-child').classList.add('active');
    loadFeed('deutschlandfunk', true);
});
