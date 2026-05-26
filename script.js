const RSS_FEEDS = {
    deutschlandfunk: "https://www.deutschlandfunk.de/nachrichten-100.rss",
    tass: "https://tass.com/rss/v2.xml",
    aljazeera: "http://www.aljazeera.com/xml/rss/all.xml",
    trumpino: "https://www.trumpstruth.org/feed",
    scmp: "https://www.scmp.com/rss/91/feed/",
    irna: "https://en.irna.ir/rss"
};

let savedComments = [];

function formatStrikethrough(text) {
    if (!text) return '';
    return text.replace(/--(.*?)--/g, '<s>$1</s>');
}

function loadSavedComments() {
    const saved = localStorage.getItem('comments');
    if (saved) {
        try {
            savedComments = JSON.parse(saved);
        } catch(e) {
            savedComments = [];
        }
    }
}

function saveComments() {
    localStorage.setItem('comments', JSON.stringify(savedComments));
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

function saveComment(articleId) {
    const textarea = document.getElementById(`comment-${articleId}`);
    if (!textarea) return false;
    
    const commentText = textarea.value.trim();
    if (!commentText) {
        alert("Bitte etwas schreiben.");
        return false;
    }
    
    const articleDiv = document.getElementById(`article-${articleId}`);
    if (!articleDiv) return false;
    
    const titleEncoded = articleDiv.getAttribute('data-title') || "";
    const linkEncoded = articleDiv.getAttribute('data-link') || "";
    const summaryEncoded = articleDiv.getAttribute('data-summary') || "";
    const dateEncoded = articleDiv.getAttribute('data-date') || "";
    
    let title = "Unbekannter Titel";
    let link = "#";
    let summary = "";
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
    } catch(e) {}
    
    const existingIndex = savedComments.findIndex(item => item.id === articleId);
    const commentEntry = {
        id: Date.now(),
        text: commentText,
        date: new Date().toISOString(),
        articleTitle: title,
        articleLink: link
    };
    
    if (existingIndex !== -1) {
        savedComments[existingIndex].comments.push(commentEntry);
    } else {
        savedComments.push({
            id: articleId,
            title: title,
            link: link,
            summary: summary,
            originalDate: date,
            comments: [commentEntry]
        });
    }
    
    saveComments();
    alert("Kommentar gespeichert.");
    textarea.value = "";
    return true;
}

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
            let cleanDescription = "";
            if (item.description && item.description !== "undefined") {
                cleanDescription = item.description.replace(/<[^>]*>/g, "").substring(0, 280);
                if (cleanDescription.length > 0) cleanDescription += "...";
            }
            
            let formattedDate = "";
            if (item.pubDate && item.pubDate !== "undefined") {
                try {
                    const dateObj = new Date(item.pubDate);
                    if (!isNaN(dateObj.getTime())) {
                        formattedDate = dateObj.toLocaleDateString();
                    }
                } catch(e) {}
            }
            
            let title = item.title || "Unbekannter Titel";
            const link = item.link || "#";
            const articleId = "art_" + Date.now() + "_" + index + "_" + Math.random().toString(36).substr(2, 8);
            
            const formattedTitle = formatStrikethrough(escapeHtml(title));
            
            const safeTitle = safeBase64Encode(title);
            const safeLink = safeBase64Encode(link);
            const safeSummary = safeBase64Encode(cleanDescription);
            const safeDate = safeBase64Encode(item.pubDate || "");
            
            feedHTML += `
                <div class="feed-item" id="article-${articleId}" 
                     data-title="${safeTitle}" 
                     data-link="${safeLink}" 
                     data-summary="${safeSummary}" 
                     data-date="${safeDate}">
                    <h3><a href="${link}" target="_blank" rel="noopener noreferrer">${formattedTitle}</a></h3>
                    <p>${escapeHtml(cleanDescription)}</p>
                    <small>${escapeHtml(formattedDate)}</small>
                    
                    <div class="comment-section">
                        <textarea id="comment-${articleId}" class="comment-input" placeholder="Kommentar" maxlength="300" rows="1"></textarea>
                        <button class="save-comment-btn" onclick="saveComment('${articleId}')">Speichern</button>
                    </div>
                </div>
            `;
        });
        
        document.getElementById("feed-content").innerHTML = feedHTML;
        
    } catch (error) {
        document.getElementById("feed-content").innerHTML = `<p class="error">Fehler beim Laden.</p>`;
    }
}

function showCommentedNews() {
    loadSavedComments();
    
    if (savedComments.length === 0) {
        document.getElementById("feed-content").innerHTML = `
            <div class="empty-comments">
                <p>Keine Kommentare gespeichert.</p>
                <p>Wähle einen Feed und schreibe etwas.</p>
            </div>
        `;
        document.querySelectorAll('.feed-selector button').forEach(btn => btn.classList.remove('active'));
        const commentsBtn = document.getElementById('comments-btn');
        if (commentsBtn) commentsBtn.classList.add('active');
        return;
    }
    
    let html = `<div class="comments-collection">`;
    
    let allComments = [];
    savedComments.forEach(article => {
        article.comments.forEach(comment => {
            allComments.push({
                id: comment.id,
                text: comment.text,
                date: comment.date,
                articleId: article.id,
                articleTitle: article.title,
                articleLink: article.link
            });
        });
    });
    
    allComments.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    allComments.forEach(comment => {
        const commentDate = new Date(comment.date).toLocaleString();
        const formattedComment = formatStrikethrough(escapeHtml(comment.text));
        const formattedTitle = formatStrikethrough(escapeHtml(comment.articleTitle));
        
        html += `
            <div class="commented-article" data-comment-id="${comment.id}" data-article-id="${comment.articleId}">
                <div class="comment-text">
                    <p>${formattedComment}</p>
                    <div class="comment-meta">
                        <span class="comment-to">zu</span>
                        <span class="article-title-link">${formattedTitle}</span>
                    </div>
                </div>
                <div class="comment-link">
                    <a href="${escapeHtml(comment.articleLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(comment.articleLink)}</a>
                </div>
                <div class="comment-meta" style="margin-top: 6px; justify-content: space-between;">
                    <small>${escapeHtml(commentDate)}</small>
                    <button class="delete-comment-btn" onclick="deleteComment('${comment.articleId}', ${comment.id})">Löschen</button>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    document.getElementById("feed-content").innerHTML = html;
    
    document.querySelectorAll('.feed-selector button').forEach(btn => btn.classList.remove('active'));
    const commentsBtn = document.getElementById('comments-btn');
    if (commentsBtn) commentsBtn.classList.add('active');
}

function formatGreeting() {
    const greetingElement = document.getElementById('greeting');
    if (greetingElement) {
        const originalText = greetingElement.innerHTML;
        greetingElement.innerHTML = formatStrikethrough(escapeHtml(originalText));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadSavedComments();
    formatGreeting();
    const firstButton = document.querySelector('.feed-selector button:first-child');
    if (firstButton) {
        loadFeed('deutschlandfunk', firstButton);
    }
});
