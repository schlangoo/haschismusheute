const RSS_FEEDS = {
    deutschlandfunk: "https://www.deutschlandfunk.de/die-nachrichten.353.de.rss",
    tass: "https://tass.com/rss/v2.xml",
    aljazeera: "https://www.aljazeera.com/xml/rss/all.xml",
    trumpino: "https://www.trumpstruth.org/feed",
    scmp: "https://www.scmp.com/rss/91/feed/",
    irna: "https://en.irna.ir/rss"
};

const CORS_PROXY = "https://proxy.cors.dev/";

function formatStrikethrough(text) {
    if (!text) return '';
    return text.replace(/--(.*?)--/g, '<s>$1</s>');
}

function safeBase64Encode(str) {
    if (!str || str === "undefined" || str === "null" || str === "") return "";
    try {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
            return String.fromCharCode(parseInt(p1, 16));
        }));
    } catch(e) {
        return "";
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function loadFeed(feedKey, clickedButton) {
    document.querySelectorAll('.feed-selector button').forEach(btn => {
        btn.classList.remove('active');
    });
    if (clickedButton) clickedButton.classList.add('active');
    
    const feedUrl = RSS_FEEDS[feedKey];
    if (!feedUrl) {
        document.getElementById("feed-content").innerHTML = `<p class="error">Feed nicht gefunden.</p>`;
        return;
    }
    
    const contentDiv = document.getElementById("feed-content");
    contentDiv.innerHTML = `<p class="no-articles">Lade Feed…</p>`;
    
    try {
        const proxyUrl = CORS_PROXY + encodeURIComponent(feedUrl);
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const xmlText = await response.text();
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        const parserError = xmlDoc.querySelector("parsererror");
        if (parserError) {
            throw new Error("XML konnte nicht geparst werden");
        }
        
        let items = xmlDoc.querySelectorAll("item");
        if (items.length === 0) {
            items = xmlDoc.querySelectorAll("entry");
        }
        
        if (items.length === 0) {
            contentDiv.innerHTML = `<p class="no-articles">Keine Artikel gefunden.</p>`;
            return;
        }
        
        let feedHTML = "";
        items.forEach((item, index) => {
            const titleEl = item.querySelector("title");
            const title = titleEl ? titleEl.textContent.trim() : "Unbekannter Titel";
            
            let link = "#";
            const linkEl = item.querySelector("link");
            if (linkEl) {
                if (linkEl.getAttribute("href")) {
                    link = linkEl.getAttribute("href");
                } else {
                    link = linkEl.textContent.trim();
                }
            }
            
            let description = "";
            const descEl = item.querySelector("description") || item.querySelector("summary") || item.querySelector("content");
            if (descEl) {
                description = descEl.textContent.trim();
            }
            let cleanDescription = description.replace(/<[^>]*>/g, "").substring(0, 280);
            if (cleanDescription.length > 0 && description.length > 280) cleanDescription += "...";
            
            let formattedDate = "";
            const dateEl = item.querySelector("pubDate") || item.querySelector("published") || item.querySelector("updated");
            if (dateEl) {
                try {
                    const dateObj = new Date(dateEl.textContent.trim());
                    if (!isNaN(dateObj.getTime())) {
                        formattedDate = dateObj.toLocaleDateString();
                    }
                } catch(e) {}
            }
            
            const formattedTitle = formatStrikethrough(escapeHtml(title));
            
            feedHTML += `
                <div class="feed-item">
                    <h3><a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${formattedTitle}</a></h3>
                    <p>${escapeHtml(cleanDescription)}</p>
                    <small>${escapeHtml(formattedDate)}</small>
                </div>
            `;
        });
        
        contentDiv.innerHTML = feedHTML;
        
    } catch (error) {
        console.error("Feed-Fehler:", error);
        contentDiv.innerHTML = `<p class="error">Fehler beim Laden: ${escapeHtml(error.message)}</p>`;
    }
}

function formatGreeting() {
    const greetingElement = document.getElementById('greeting');
    if (greetingElement) {
        const originalText = greetingElement.innerHTML;
        greetingElement.innerHTML = formatStrikethrough(escapeHtml(originalText));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    formatGreeting();
    const firstButton = document.querySelector('.feed-selector button:first-child');
    if (firstButton) {
        loadFeed('deutschlandfunk', firstButton);
    }
});
