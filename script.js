const RSS_FEEDS = {
    deutschlandfunk: "https://www.deutschlandfunk.de/nachrichten-100.rss",
    jungewelt: "https://www.jungewelt.de/feeds/newsticker.rss",
    aljazeera: "https://www.aljazeera.com/xml/rss/all.xml",
    un: "https://news.un.org/feed/subscribe/en/news/all/rss.xml",
    propublica: "https://www.nachdenkseiten.de/?feed=rss2"
};

async function loadFeed(feedKey, initialLoad = false) {
    if (!initialLoad) {
        // Entferne aktive Klasse von allen Buttons
        document.querySelectorAll('.feed-selector button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Füge aktive Klasse zum geklickten Button hinzu
        event.target.classList.add('active');
    }
    
    const feedUrl = RSS_FEEDS[feedKey];
    try {
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`);
        const data = await response.json();
        
        let feedHTML = "";
        if (data.items && data.items.length > 0) {
            data.items.forEach(item => {
                const cleanDescription = item.description.replace(/<[^>]*>/g, "").substring(0, 400) + "...";
                feedHTML += `
                    <div class="feed-item">
                        <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
                        <p>${cleanDescription}</p>
                        <small>${new Date(item.pubDate).toLocaleString()}</small>
                    </div>
                `;
            });
        } else {
            feedHTML = `<p class="no-articles">Keine Artikel gefunden. Bitte versuche es später erneut.</p>`;
        }
        
        document.getElementById("feed-content").innerHTML = feedHTML;
    } catch (error) {
        console.error("Fehler beim Laden des Feeds:", error);
        document.getElementById("feed-content").innerHTML = 
            `<p class="error">Fehler beim Laden des Feeds. Bitte versuche es später erneut.</p>`;
    }
}

// Standardmäßig ersten Feed laden und Button als aktiv markieren
document.addEventListener('DOMContentLoaded', function() {
    // Manuell den ersten Button als aktiv markieren
    document.querySelector('.feed-selector button:first-child').classList.add('active');
    // Feed mit initialLoad-Flag laden
    loadFeed('deutschlandfunk', true);
});
