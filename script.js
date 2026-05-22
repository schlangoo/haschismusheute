const RSS_FEEDS = {
    deutschlandfunk: "https://www.deutschlandfunk.de/nachrichten-100.rss",
    tass: "https://tass.com/rss/v2.xml",
    aljazeera: "http://www.aljazeera.com/xml/rss/all.xml",
    trumpino: "https://www.trumpstruth.org/feed",
    scmp: "https://www.scmp.com/rss/91/feed/",
    irna: "https://en.irna.ir/rss"
};

// Deine kommentierten Artikel (lokal gespeichert)
let commentedArticles = [];

// Lade gespeicherte Kommentare aus localStorage
function loadCommentedArticles() {
    const saved = localStorage.getItem('haschismus_comments');
    if (saved) {
        commentedArticles = JSON.parse(saved);
    }
}

// Speichere Kommentare in localStorage
function saveCommentedArticles() {
    localStorage.setItem('haschismus_comments', JSON.stringify(commentedArticles));
}

// Füge einen Artikel mit Kommentar hinzu
function addCommentToArticle(article, comment) {
    const existingIndex = commentedArticles.findIndex(a => a.link === article.link);
    
    const commentEntry = {
        id: Date.now(),
        text: comment,
        date: new Date().toISOString()
    };
    
    if (existingIndex !== -1) {
        commentedArticles[existingIndex].comments.push(commentEntry);
    } else {
        commentedArticles.push({
            ...article,
            comments: [commentEntry]
        });
    }
    
    saveCommentedArticles();
    return true;
}

// Lösche einen Kommentar
function deleteComment(articleId, commentId) {
    const article = commentedArticles.find(a => a.id === articleId);
    if (article) {
        article.comments = article.comments.filter(c => c.id !== commentId);
        if (article.comments.length === 0) {
            commentedArticles = commentedArticles.filter(a => a.id !== articleId);
        }
        saveCommentedArticles();
        // Aktualisiere die Anzeige wenn wir im Haschismus-Feed sind
        if (document.getElementById('feed-content').querySelector('.haschismus-container')) {
            showCommentedNews();
        }
    }
}

// Hilfsfunktion zum Escapen von HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Zeige die kommentierten Nachrichten an
function showCommentedNews() {
    const feedContainer = document.getElementById("feed-content");
    
    if (commentedArticles.length === 0) {
        feedContainer.innerHTML = `
            <div class="haschismus-container">
                <p class="no-articles">🌟 Noch keine kommentierten Nachrichten.<br>
                Klicke bei einem Artikel auf "💬 Haschismus-Kommentar", um deine Gedanken festzuhalten.</p>
            </div>
        `;
        return;
    }
    
    let feedHTML = `<div class="haschismus-container">`;
    
    // Sortiere nach neuestem Kommentar
    commentedArticles.sort((a, b) => {
        const aDate = a.comments[0]?.date || 0;
        const bDate = b.comments[0]?.date || 0;
        return new Date(bDate) - new Date(aDate);
    });
    
    commentedArticles.forEach(article => {
        feedHTML += `
            <div class="feed-item commented-item" data-article-id="${article.id}">
                <h3><a href="${article.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.title)}</a></h3>
                <p class="article-summary">${escapeHtml(article.summary)}</p>
                <small>Original: ${new Date(article.date).toLocaleString()}</small>
                <div class="comments-section">
                    <h4>💭 Haschismus-Gedanken:</h4>
        `;
        
        article.comments.forEach(comment => {
            feedHTML += `
                <div class="comment-item" data-comment-id="${comment.id}">
                    <p>💬 ${escapeHtml(comment.text)}</p>
                    <small>✍️ ${new Date(comment.date).toLocaleString()}</small>
                    <button class="delete-comment" onclick="deleteComment(${article.id}, ${comment.id})">🗑️ Löschen</button>
                </div>
            `;
        });
        
        feedHTML += `
                    <button class="add-comment-btn" onclick='openCommentModalForArticle(${JSON.stringify(article.id)})'>
                        ✏️ Weitere Gedanken hinzufügen
                    </button>
                </div>
            </div>
        `;
    });
    
    feedHTML += `</div>`;
    feedContainer.innerHTML = feedHTML;
    
    // Aktiviere den Haschismus-Button
    document.querySelectorAll('.feed-selector button').forEach(btn => btn.classList.remove('active'));
    const haschismusBtn = document.getElementById('haschismus-btn');
    if (haschismusBtn) haschismusBtn.classList.add('active');
}

// Zeige das Kommentar-Modal an (universelle Funktion)
function showCommentModal(articleTitle, onSaveCallback) {
    const modal = document.getElementById('comment-modal');
    const commentContainer = document.getElementById('comment-container');
    
    if (!modal || !commentContainer) return;
    
    commentContainer.innerHTML = `
        <h3>💭 Haschismus-Gedanke zu:</h3>
        <p class="modal-article-title">${escapeHtml(articleTitle)}</p>
        <textarea id="comment-text" placeholder="Deine Gedanken zum Haschismus... (max. 500 Zeichen)" maxlength="500" rows="5"></textarea>
        <div class="modal-buttons">
            <button id="save-comment" class="save-btn">💾 Speichern</button>
            <button id="cancel-comment" class="cancel-btn">❌ Abbrechen</button>
        </div>
    `;
    
    modal.style.display = "block";
    
    const saveBtn = document.getElementById('save-comment');
    const cancelBtn = document.getElementById('cancel-comment');
    const closeSpan = document.querySelector('#comment-modal .close');
    
    const cleanup = () => {
        saveBtn?.removeEventListener('click', saveHandler);
        cancelBtn?.removeEventListener('click', closeHandler);
        closeSpan?.removeEventListener('click', closeHandler);
        window.removeEventListener('click', outsideClickHandler);
    };
    
    const saveHandler = () => {
        const commentText = document.getElementById('comment-text').value.trim();
        if (commentText) {
            onSaveCallback(commentText);
            modal.style.display = "none";
            cleanup();
        } else {
            alert('Bitte gib einen Haschismus-Gedanken ein!');
        }
    };
    
    const closeHandler = () => {
        modal.style.display = "none";
        cleanup();
    };
    
    const outsideClickHandler = (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
            cleanup();
        }
    };
    
    saveBtn?.addEventListener('click', saveHandler);
    cancelBtn?.addEventListener('click', closeHandler);
    closeSpan?.addEventListener('click', closeHandler);
    window.addEventListener('click', outsideClickHandler);
}

// Öffne das Kommentar-Modal für einen neuen Artikel (aus den normalen Feeds)
function openCommentModal(title, link, summary, pubDate) {
    const newArticle = {
        id: Date.now(),
        title: title,
        link: link,
        summary: summary,
        date: pubDate,
        comments: []
    };
    
    showCommentModal(title, (comment) => {
        addCommentToArticle(newArticle, comment);
        alert('💚 Haschismus-Gedanke gespeichert! Finde ihn unter "Haschismus Heute"');
    });
}

// Öffne das Kommentar-Modal für einen bereits kommentierten Artikel (um weiteren Kommentar hinzuzufügen)
function openCommentModalForArticle(articleId) {
    const article = commentedArticles.find(a => a.id == articleId);
    if (article) {
        showCommentModal(article.title, (comment) => {
            addCommentToArticle(article, comment);
            showCommentedNews();
        });
    }
}

async function loadFeed(feedKey, initialLoad = false, clickedElement = null) {
    if (!initialLoad && clickedElement) {
        document.querySelectorAll('.feed-selector button').forEach(btn => {
            btn.classList.remove('active');
        });
        clickedElement.classList.add('active');
    }
    
    const feedUrl = RSS_FEEDS[feedKey];
    if (!feedUrl) {
        document.getElementById("feed-content").innerHTML = `<p class="error">Feed nicht gefunden.</p>`;
        return;
    }
    
    try {
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`);
        const data = await response.json();
        
        let feedHTML = "";
        if (data.items && data.items.length > 0) {
            data.items.forEach(item => {
                const cleanDescription = item.description ? item.description.replace(/<[^>]*>/g, "").substring(0, 400) + "..." : "Keine Beschreibung verfügbar.";
                // Escapen für sicheres Einfügen in onclick
                const escapedTitle = escapeHtml(item.title).replace(/'/g, "\\'");
                const escapedLink = escapeHtml(item.link).replace(/'/g, "\\'");
                const escapedSummary = escapeHtml(cleanDescription).replace(/'/g, "\\'");
                const escapedDate = escapeHtml(item.pubDate).replace(/'/g, "\\'");
                
                feedHTML += `
                    <div class="feed-item">
                        <h3><a href="${item.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
                        <p>${cleanDescription}</p>
                        <small>${new Date(item.pubDate).toLocaleString()}</small>
                        <button class="comment-article-btn" onclick="openCommentModal('${escapedTitle}', '${escapedLink}', '${escapedSummary}', '${escapedDate}')">
                            💬 Haschismus-Kommentar
                        </button>
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

// Lade den Haschismus-Feed
function loadCommentedFeed() {
    showCommentedNews();
}

// Initialisierung
document.addEventListener('DOMContentLoaded', function() {
    loadCommentedArticles();
    
    const firstButton = document.querySelector('.feed-selector button:first-child');
    if (firstButton) {
        firstButton.classList.add('active');
        loadFeed('deutschlandfunk', true, firstButton);
    }
});
