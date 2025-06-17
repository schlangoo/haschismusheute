const RSS_FEEDS = {
    deutschlandfunk: "https://www.deutschlandfunk.de/nachrichten-100.rss",
    jungewelt: "https://www.jungewelt.de/feeds/newsticker.rss",
    aljazeera: "https://www.aljazeera.com/xml/rss/all.xml",
    peoplesdispatch: "https://peoplesdispatch.org/feed/",
    lemonde: "https://www.lemonde.fr/en/rss/une.xml",
    telesur: "https://www.telesurenglish.net/news/"
};

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
            data.items.forEach(item => {
                const cleanDescription = item.description.replace(/<[^>]*>/g, "").substring(0, 400) + "...";
                feedHTML += `
                    <div class="feed-item">
                        <h3><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a></h3>
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

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.feed-selector button:first-child').classList.add('active');
    loadFeed('deutschlandfunk', true);
});
