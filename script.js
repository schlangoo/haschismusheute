const RSS_FEEDS = {
    deutschlandfunk: "https://www.deutschlandfunk.de/nachrichten-100.rss",
    taz: "https://taz.de/!p4608;rss/",
    aljazeera: "https://www.aljazeera.com/xml/rss/all.xml",
    guardian: "https://www.theguardian.com/rss",
    propublica: "https://www.propublica.org/feeds"
};

async function loadFeed(feedKey) {
    const feedUrl = RSS_FEEDS[feedKey];
    const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`);
    const data = await response.json();
    
    let feedHTML = "";
    data.items.forEach(item => {
        // Entfernt HTML-Tags aus der Beschreibung (für sauberen Text)
        const cleanDescription = item.description.replace(/<[^>]*>/g, "").substring(0, 200) + "...";
        feedHTML += `
            <div class="feed-item">
                <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
                <p>${cleanDescription}</p>
                <small>${new Date(item.pubDate).toLocaleString()}</small>
            </div>
        `;
    });
    
    document.getElementById("feed-content").innerHTML = feedHTML;
}

// Standardmäßig ersten Feed laden
loadFeed('deutschlandfunk');
