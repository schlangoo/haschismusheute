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
        try {
            savedComments = JSON.parse(saved);
            console.log("Geladene Kommentare:", savedComments.length);
        } catch(e) {
            console.error("Fehler beim Laden:", e);
            savedComments = [];
        }
    }
}

// Speichere Kommentare in localStorage
function saveComments() {
    localStorage.setItem('haschismus_comments', JSON.stringify(savedComments));
    console.log("Gespeichert:", savedComments.length);
}

// Sichere Base64-Kodierung für UTF-8 (funktioniert mit Umlauten und leeren Werten)
function safeBase64Encode(str) {
    if (!str || str === "undefined" || str === "null") return "";
    try {
        // Für leere Strings direkt zurück
        if (str === "") return "";
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
            return String.fromCharCode(parseInt(p1, 16));
        }));
    } catch(e) {
        console.warn("Base64 Fehler für:", str);
        return "";
    }
}

// Sichere Base64-Dekodierung
function safeBase64Decode(str) {
    if (!str || str === "") return "";
    try {
        return decodeURIComponent(atob(str).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    } catch(e) {
        return str;
    }
}

// Kommentar zu einem Artikel speichern (mit Debug-Ausgaben)
function saveComment(articleId) {
    console.log("=== SAVE COMMENT START ===");
    console.log("articleId:", articleId);
    
    // Textfeld direkt aus dem DOM holen
    const textarea = document.getElementById(`comment-${articleId}`);
    if (!textarea) {
        console.error("Textarea nicht gefunden für:", articleId);
        alert("Fehler: Kommentarfeld nicht gefunden");
        return false;
    }
    
    const commentText = textarea.value.trim();
    console.log("Kommentartext:", commentText);
    
    if (!commentText) {
        alert("Bitte schreib etwas in dein Haschismus-Kommentarfeld!");
        return false;
    }
    
    // Die Artikel-Daten aus data-Attributen holen
    const articleDiv = document.getElementById(`article-${articleId}`);
    if (!articleDiv) {
        console.error("Article Div nicht gefunden für:", articleId);
        alert("Fehler: Artikel nicht gefunden");
        return false;
    }
    
    // Data-Attribute auslesen
    const titleEncoded = articleDiv.getAttribute('data-title') || "";
    const linkEncoded = articleDiv.getAttribute('data-link') || "";
    const summaryEncoded = articleDiv.getAttribute('data-summary') || "";
    const dateEncoded = articleDiv.getAttribute('data-date') || "";
    
    console.log("Encoded Title:", titleEncoded);
    console.log("Encoded Link:", linkEncoded);
    
    // Dekodieren mit Fallbacks
    let title = "Unbekannter Titel";
    let link = "#";
    let summary = "Keine Zusammenfassung";
    let date = new Date().toISOString();
    
    try {
        if (titleEncoded && titleEncoded !== "") {
            const decoded = safeBase64Decode(titleEncoded);
            if (decoded && decoded !== "") title = decoded;
        }
        if (linkEncoded && linkEncoded !== "") {
            const decoded = safeBase64Decode(linkEncoded);
            if (decoded && decoded !== "") link = decoded;
        }
        if (summaryEncoded && summaryEncoded !== "") {
            const decoded = safeBase64Decode(summaryEncoded);
            if (decoded && decoded !== "") summary = decoded;
        }
        if (dateEncoded && dateEncoded !== "") {
            const decoded = safeBase64Decode(dateEncoded);
            if (decoded && decoded !== "") date = decoded;
        }
    } catch(e) {
        console.error("Dekodierungsfehler:", e);
    }
    
    console.log("Titel dekodiert:", title);
    console.log("Link dekodiert:", link);
    
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
    textarea.value = "";
    
    console.log("=== SAVE COMMENT END ===");
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
    console.log("Lade Feed:", feedKey);
    
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
        
        console.log("Feed geladen:", feedKey, "Artikelanzahl:", data.items ? data.items.length : 0);
        
        if (!data.items || data.items.length === 0) {
            document.getElementById("feed-content").innerHTML = `<p class="no-articles">Keine Artikel gefunden.</p>`;
            return;
        }
        
        let feedHTML = "";
        data.items.forEach((item, index) => {
            // Bereinige die Beschreibung sicher
            let cleanDescription = "Keine Beschreibung verfügbar.";
            if (item.description && item.description !== "undefined") {
                cleanDescription = item.description.replace(/<[^>]*>/g, "").substring(0, 300);
                if (cleanDescription.length > 0 && cleanDescription.length < 300) cleanDescription += "...";
                if (cleanDescription.length === 300) cleanDescription += "...";
            }
            
            // Sichere Behandlung des Datums
            let pubDate = item.pubDate;
            let formattedDate = "Datum unbekannt";
            if (pubDate && pubDate !== "undefined" && pubDate !== "Invalid Date") {
                try {
                    const dateObj = new Date(pubDate);
                    if (!isNaN(dateObj.getTime())) {
                        formattedDate = dateObj.toLocaleString();
                    }
                } catch(e) {
                    formattedDate = "Datum unbekannt";
                }
            }
            
            // Stelle sicher dass Titel und Link existieren
            const title = item.title || "Unbekannter Titel";
            const link = item.link || "#";
            
            // Eindeutige ID pro Artikel
            const articleId = "art_" + Date.now() + "_" + index + "_" + Math.random().toString(36).substr(2, 8);
            
            // Daten für data-Attribute sicher kodieren
            const safeTitle = safeBase64Encode(title);
            const safeLink = safeBase64Encode(link);
            const safeSummary = safeBase64Encode(cleanDescription);
            const safeDate = safeBase64Encode(pubDate || "");
            
            feedHTML += `
                <div class="feed-item" id="article-${articleId}" 
                     data-title="${safeTitle}" 
                     data-link="${safeLink}" 
                     data-summary="${safeSummary}" 
                     data-date="${safeDate}">
                    <h3><a href="${link}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a></h3>
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
        console.log(`Feed geladen: ${feedKey}, ${data.items.length} Artikel, Buttons sollten funktionieren`);
        
    } catch (error) {
        console.error("Fehler beim Laden des Feeds:", error);
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
                <hr>
                <p><small>Test: Klicke bei TASS oder Al Jazeera auf Speichern - das sollte auf jeden Fall funktionieren!</small></p>
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
        if (article.originalDate && article.originalDate !== "undefined" && article.originalDate !== "") {
            try {
                const dateObj = new Date(article.originalDate);
                if (!isNaN(dateObj.getTime())) {
                    displayDate = dateObj.toLocaleString();
                }
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

// Test-Funktion für Deutschlandfunk
function testDLF() {
    console.log("Teste Deutschlandfunk Feed...");
    loadFeed('deutschlandfunk', document.querySelector('.feed-selector button:first-child'));
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
