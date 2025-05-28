const RSS_FEEDS = {
    deutschlandfunk: "https://www.deutschlandfunk.de/nachrichten-100.rss",
    taz: "https://taz.de/!p4608;rss/",
    aljazeera: "https://www.aljazeera.com/xml/rss/all.xml",
    guardian: "https://www.theguardian.com/rss",
    propublica: "https://www.propublica.org/feeds"
};

function needsTranslation(feedKey) {
    return ['aljazeera', 'guardian', 'propublica'].includes(feedKey);
}

async function loadFeed(feedKey) {
    document.querySelectorAll('.feed-selector button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Übersetzungshinweis anzeigen/verstecken
    const notice = document.getElementById('translation-notice');
    if (needsTranslation(feedKey)) {
        notice.innerHTML = '<div class="translation-note">⚠️ Automatisch übersetzter Inhalt</div>';
    } else {
        notice.innerHTML = '';
    }
    
    const feedUrl = RSS_FEEDS[feedKey];
    const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`);
    const data = await response.json();
    
    let feedHTML = "";
    data.items.forEach(item => {
        const cleanDescription = item.description.replace(/<[^>]*>/g, "").substring(0, 200) + "...";
        feedHTML += `
            <div class="feed-item" ${needsTranslation(feedKey) ? 'translate="yes"' : 'translate="no"'}>
                <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
                <p>${cleanDescription}</p>
                <small>${new Date(item.pubDate).toLocaleString()}</small>
            </div>
        `;
    });
    
    document.getElementById("feed-content").innerHTML = feedHTML;
}

document.addEventListener('DOMContentLoaded', function() {
    loadFeed('deutschlandfunk');
    document.querySelector('.feed-selector button:first-child').classList.add('active');
});
