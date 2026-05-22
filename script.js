const RSS_FEEDS = {
    deutschlandfunk: "https://www.deutschlandfunk.de/nachrichten-100.rss",
    tass: "https://tass.com/rss/v2.xml",
    aljazeera: "http://www.aljazeera.com/xml/rss/all.xml",
    trumpino: "https://www.trumpstruth.org/feed",
    scmp: "https://www.scmp.com/rss/91/feed/",
    irna: "https://en.irna.ir/rss"
};

// Gespeicherte kommentierte Artikel
let savedComments = [];

// Lade gespeicherte Kommentare aus localStorage
function loadSavedComments() {
    const saved = localStorage.getItem('haschismus_comments');
    if (saved) {
        savedComments = JSON.parse(saved);
        console.log("Geladene Kommentare:", savedComments.length);
    }
}

// Speichere Kommentare in localStorage
function saveComments() {
    localStorage.setItem('haschismus_comments', JSON.stringify(savedComments));
    console.log("Gespeichert:", savedComments.length);
}

// Sichere Base64-Kodierung für UTF-8 (funktioniert mit Umlauten!)
function safeBase64Encode(str) {
    if (!str) return "";
    try {
        // Verwende encodeURIComponent + btoa für UTF-8 Sicherheit
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
            return String.fromCharCode(parseInt(p1, 16));
        }));
    } catch(e) {
        console.warn("Base64 Fehler, fallback auf leeren String");
        return "";
    }
}

// Sichere Base64-Dekodierung
function safeBase64Decode(str) {
    if (!str) return "";
    try {
        return decodeURIComponent(atob(str).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    } catch(e) {
        return str;
    }
}

// Kommentar zu einem Artikel speichern
function saveComment(articleId) {
    console.log("saveComment aufgerufen für:", articleId);
    
    // Textfeld direkt aus dem DOM holen
    const textarea = document.getElementById(`comment-${articleId}`);
    const commentText = textarea ? textarea.value.trim() : "";
    
    // Die Artikel-Daten aus data-Attributen holen (Base64 dekodieren)
    const articleDiv = document.getElementById(`article-${articleId}`);
    if (!articleDiv) {
        console.error("Article Div nicht gefunden für:", articleId);
        alert("Fehler: Artikel nicht gefunden");
        return false;
    }
    
    // Daten aus data-Attributen holen und dekodieren
    const titleEncoded = articleDiv.getAttribute('data-title') || "";
    const linkEncoded = articleDiv.getAttribute('data-link') || "";
    const summaryEncoded = articleDiv.getAttribute('data-summary') || "";
    const dateEncoded = articleDiv.getAttribute('data-date') || "";
    
    const title = safeBase64Decode(titleEncoded) || "Unbekannter Titel";
    const link = safeBase64Decode(linkEncoded) || "#";
    const summary = safeBase64Decode(summaryEncoded) || "Keine Zusammenfassung";
    const date = safeBase64Decode(dateEncoded) || new Date().toISOString();
    
    console.log("Titel dekodiert:", title);
    console.log("Kommentar:", commentText);
    
    if (!commentText) {
        alert("Bitte schreib etwas in dein Haschismus-Kommentarfeld!");
        return false;
    }
    
    // Prüfen ob Artikel schon kommentiert wurde
    const existingIndex = savedComments.findIndex(item => item.id === articleId);
    
    const commentEntry = {
        id: Date.now(),
        text: commentText,
        date: new Date().toISOString()
    };
    
    if (existingIndex !== -1) {
        savedComments[existingIndex].comments.push(commentEntry);
        console.log("Kommentar zu bestehendem Artikel hinzugefügt");
    } else {
        savedComments.push({
            id: articleId,
            title: title,
            link: link,
            summary: summary,
            originalDate: date,
            comments: [commentEntry]
        });
        console.log("Neuer Artikel mit Kommentar angelegt");
    }
    
    saveComments();
    alert("💾 Haschismus-Gedanke gespeichert! → Unter 'Haschismus Heute' ansehen.");
    
    // Textfeld leeren
    if (textarea) textarea.value = "";
    
    return true;
}

// Kommentar löschen
function deleteComment(articleId, commentId) {
    const article = savedComments.find(a => a.id === articleId);
    if (article) {
        article.comments = article.comments.filter(c => c.id !== commentId);
        if (article.comments.length === 0) {
            const index = savedComments.findIndex(a => a.id === articleId);
            if (index !== -1) savedComments.splice(index, 1);
        }
        saveComments();
        showCommentedNews();
    }
}

// HTML-escape für Sicherheit
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Normalen Feed laden (mit Kommentarfeld unter jedem Artikel)
async function loadFeed(feedKey, clickedButton) {
    // Aktiven Button markieren
    document.querySelectorAll('.feed-selector button').forEach(btn => {
        btn.classList.remove('active');
    });
    clickedButton.classList.add('active');
    
    const feedUrl = RSS_FEEDS[feedKey];
    if (!feedUrl) {
        document.getElementById("feed-content").innerHTML = `<p class="error">Feed nicht gefunden.</p>`;
        return;
    }
    
    try {
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`);
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            document.getElementById("feed-content").innerHTML = `<p class="no-articles">Keine Artikel gefunden.</p>`;
            return;
        }
        
        let feedHTML = "";
        data.items.forEach((item, index) => {
            // Bereinige die Beschreibung sicher
            let cleanDescription = "Keine Beschreibung verfügbar.";
            if (item.description) {
                cleanDescription = item.description.replace(/<[^>]*>/g, "").substring(0, 300);
                if (cleanDescription.length > 0 && cleanDescription.length < 300) cleanDescription += "...";
                if (cleanDescription.length === 300) cleanDescription += "...";
            }
            
            // Sichere Behandlung des Datums
            let pubDate = item.pubDate;
            let formattedDate = "Datum unbekannt";
            if (pubDate) {
                try {
                    formattedDate = new Date(pubDate).toLocaleString();
                    if (formattedDate === "Invalid Date") formattedDate = "Datum unbekannt";
                } catch(e) {
                    formattedDate = "Datum unbekannt";
                }
            }
            
            // Eindeutige ID pro Artikel
            const articleId = "art_" + Date.now() + "_" + index + "_" + Math.random().toString(36).substr(2, 8);
            
            // Daten für data-Attribute sicher kodieren (mit neuer sicherer Funktion)
            const safeTitle = safeBase64Encode(item.title);
            const safeLink = safeBase64Encode(item.link);
            const safeSummary = safeBase64Encode(cleanDescription);
            const safeDate = safeBase64Encode(pubDate || "");
            
            feedHTML += `
                <div class="feed-item" id="article-${articleId}" 
                     data-title="${safeTitle}" 
                     data-link="${safeLink}" 
                     data-summary="${safeSummary}" 
                     data-date="${safeDate}">
                    <h3><a href="${item.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
                    <p>${escapeHtml(cleanDescription)}</p>
                    <small>📅 ${escapeHtml(formattedDate)}</small>
                    
                    <div class="comment-section">
                        <label>💬 Haschismus-Kommentar:</label>
                        <textarea id="comment-${articleId}" class="comment-input" placeholder="Deine Gedanken zum Haschismus... (max. 300 Zeichen)" maxlength="300" rows="2"></textarea>
                        <button class="save-comment-btn" onclick="saveComment('${articleId}')">
                            💾 Haschismus-Gedanke speichern
                        </button>
                    </div>
                </div>
            `;
        });
        
        document.getElementById("feed-content").innerHTML = feedHTML;
        console.log(`Feed geladen: ${feedKey}, ${data.items.length} Artikel`);
        
    } catch (error) {
        console.error("Fehler:", error);
        document.getElementById("feed-content").innerHTML = `<p class="error">Fehler beim Laden des Feeds: ${error.message}</p>`;
    }
}

// "Haschismus Heute" anzeigen
function showCommentedNews() {
    loadSavedComments();
    
    if (savedComments.length === 0) {
        document.getElementById("feed-content").innerHTML = `
            <div class="empty-haschismus">
                <p>🌟 Noch keine Haschismus-Gedanken gespeichert.</p>
                <p>👉 Klicke auf einen News-Feed und hinterlasse unter einem Artikel deinen Kommentar.</p>
                <p>💾 Der Artikel + dein Kommentar landen dann hier!</p>
            </div>
        `;
        document.querySelectorAll('.feed-selector button').forEach(btn => btn.classList.remove('active'));
        const haschismusBtn = document.getElementById('haschismus-btn');
        if (haschismusBtn) haschismusBtn.classList.add('active');
        return;
    }
    
    let html = `<div class="haschismus-collection">`;
    
    [...savedComments].reverse().forEach(article => {
        let displayDate = "Datum unbekannt";
        if (article.originalDate && article.originalDate !== "undefined") {
            try {
                displayDate = new Date(article.originalDate).toLocaleString();
                if (displayDate === "Invalid Date") displayDate = "Datum unbekannt";
            } catch(e) {
                displayDate = "Datum unbekannt";
            }
        }
        
        html += `
            <div class="commented-article">
                <h3><a href="${escapeHtml(article.link)}" target="_blank">${escapeHtml(article.title)}</a></h3>
                <p class="original-summary">📰 ${escapeHtml(article.summary)}</p>
                <small class="original-date">🗓️ Original: ${escapeHtml(displayDate)}</small>
                
                <div class="my-comments">
                    <h4>💭 Meine Haschismus-Gedanken:</h4>
        `;
        
        article.comments.forEach(comment => {
            const commentDate = new Date(comment.date).toLocaleString();
            html += `
                <div class="comment-box">
                    <p>✍️ ${escapeHtml(comment.text)}</p>
                    <small>📝 ${escapeHtml(commentDate)}</small>
                    <button class="delete-comment-btn" onclick="deleteComment('${article.id}', ${comment.id})">🗑️ Löschen</button>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    document.getElementById("feed-content").innerHTML = html;
    
    document.querySelectorAll('.feed-selector button').forEach(btn => btn.classList.remove('active'));
    const haschismusBtn = document.getElementById('haschismus-btn');
    if (haschismusBtn) haschismusBtn.classList.add('active');
}

// Debug-Funktion
function showDebugInfo() {
    console.log("=== DEBUG INFO ===");
    console.log("Gespeicherte Kommentare:", savedComments);
    console.log("LocalStorage:", localStorage.getItem('haschismus_comments'));
}

// Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    console.log("Seite geladen, initialisiere...");
    loadSavedComments();
    const firstButton = document.querySelector('.feed-selector button:first-child');
    if (firstButton) {
        loadFeed('deutschlandfunk', firstButton);
    }
});
