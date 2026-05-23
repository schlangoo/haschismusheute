// ============================================
// SUPABASE KONFIGURATION - HIER DEINE DATEN!
// ============================================
const SUPABASE_URL = "kwsxwnlibtkqbtbxkjqz";
const SUPABASE_KEY = "sb_publishable_4vTpUdycQsSSRGwzWeSzUA_ttibUlfC";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// RSS FEEDS
// ============================================
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

function safeBase64Encode(str) {
    if (!str || str === "undefined" || str === "null" || str === "") return "";
    try {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
            return String.fromCharCode(parseInt(p1, 16));
        }));
    } catch(e) { return ""; }
}

function safeBase64Decode(str) {
    if (!str || str === "") return "";
    try {
        return decodeURIComponent(atob(str).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    } catch(e) { return str; }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// KOMMENTARE LADEN
// ============================================
async function loadCommentsFromSupabase() {
    const { data, error } = await supabase
        .from('comments')
        .select('*')
        .order('date', { ascending: false });
    
    if (data) {
        savedComments = [];
        data.forEach(item => {
            savedComments.push({
                id: "sb_" + item.id,
                title: item.article_title || "Unbekannt",
                link: item.article_link || "#",
                summary: "",
                originalDate: item.date || "",
                comments: [{
                    id: item.id,
                    text: item.text,
                    date: item.date,
                    articleTitle: item.article_title,
                    articleLink: item.article_link
                }]
            });
        });
        localStorage.setItem('comments', JSON.stringify(savedComments));
    } else {
        const saved = localStorage.getItem('comments');
        if (saved) savedComments = JSON.parse(saved);
    }
}

// ============================================
// KOMMENTAR SPEICHERN
// ============================================
async function saveComment(articleId) {
    const textarea = document.getElementById(`comment-${articleId}`);
    if (!textarea) return false;
    
    const commentText = textarea.value.trim();
    if (!commentText) { alert("Bitte etwas schreiben."); return false; }
    
    const articleDiv = document.getElementById(`article-${articleId}`);
    if (!articleDiv) return false;
    
    const titleEncoded = articleDiv.getAttribute('data-title') || "";
    const linkEncoded = articleDiv.getAttribute('data-link') || "";
    
    let title = "Unbekannter Titel";
    let link = "#";
    
    try {
        if (titleEncoded && titleEncoded !== "") {
            const decoded = safeBase64Decode(titleEncoded);
            if (decoded && decoded !== "") title = decoded;
        }
        if (linkEncoded && linkEncoded !== "") {
            const decoded = safeBase64Decode(linkEncoded);
            if (decoded && decoded !== "") link = decoded;
        }
    } catch(e) {}
    
    const { error } = await supabase
        .from('comments')
        .insert([{
            text: commentText,
            article_title: title,
            article_link: link,
            article_id: articleId
        }]);
    
    if (error) {
        alert("Fehler beim Speichern.");
        return false;
    }
    
    await loadCommentsFromSupabase();
    alert("Kommentar gespeichert!");
    textarea.value = "";
    return true;
}

async function deleteComment(commentId) {
    await supabase.from('comments').delete().eq('id', commentId);
    await loadCommentsFromSupabase();
    showCommentedNews();
}

// ============================================
// FEEDS LADEN
// ============================================
async function loadFeed(feedKey, clickedButton) {
    document.querySelectorAll('.feed-selector button').forEach(btn => btn.classList.remove('active'));
    clickedButton.classList.add('active');
    
    const feedUrl = RSS_FEEDS[feedKey];
    if (!feedUrl) {
        document.getElementById("feed-content").innerHTML = '<p class="error">Feed nicht gefunden.</p>';
        return;
    }
    
    try {
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`);
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            document.getElementById("feed-content").innerHTML = '<p class="no-articles">Keine Artikel gefunden.</p>';
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
                    if (!isNaN(dateObj.getTime())) formattedDate = dateObj.toLocaleDateString();
                } catch(e) {}
            }
            
            let title = item.title || "Unbekannter Titel";
            const link = item.link || "#";
            const articleId = "art_" + Date.now() + "_" + index + "_" + Math.random().toString(36).substr(2, 8);
            
            feedHTML += `
                <div class="feed-item" id="article-${articleId}" 
                     data-title="${safeBase64Encode(title)}" 
                     data-link="${safeBase64Encode(link)}" 
                     data-summary="${safeBase64Encode(cleanDescription)}" 
                     data-date="${safeBase64Encode(item.pubDate || "")}">
                    <h3><a href="${link}" target="_blank" rel="noopener noreferrer">${formatStrikethrough(escapeHtml(title))}</a></h3>
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
        document.getElementById("feed-content").innerHTML = '<p class="error">Fehler beim Laden.</p>';
    }
}

// ============================================
// KOMMENTARE ANZEIGEN
// ============================================
async function showCommentedNews() {
    await loadCommentsFromSupabase();
    
    if (savedComments.length === 0) {
        document.getElementById("feed-content").innerHTML = `
            <div class="empty-comments">
                <p>Keine Kommentare gespeichert.</p>
                <p>Wähle einen Feed und schreibe etwas!</p>
            </div>
        `;
        document.querySelectorAll('.feed-selector button').forEach(btn => btn.classList.remove('active'));
        document.getElementById('comments-btn').classList.add('active');
        return;
    }
    
    let html = '<div class="comments-collection">';
    let allComments = [];
    
    savedComments.forEach(article => {
        if (article.comments && Array.isArray(article.comments)) {
            article.comments.forEach(comment => {
                allComments.push({
                    id: comment.id,
                    text: comment.text,
                    date: comment.date,
                    articleTitle: comment.articleTitle || article.title,
                    articleLink: comment.articleLink || article.link
                });
            });
        }
    });
    
    allComments.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    allComments.forEach(comment => {
        const commentDate = new Date(comment.date).toLocaleString();
        
        html += `
            <div class="commented-article">
                <div class="comment-text">
                    <p>${formatStrikethrough(escapeHtml(comment.text))}</p>
                    <div class="comment-meta">
                        <span class="comment-to">zu</span>
                        <span class="article-title-link">${formatStrikethrough(escapeHtml(comment.articleTitle))}</span>
                    </div>
                </div>
                <div class="comment-link">
                    <a href="${escapeHtml(comment.articleLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(comment.articleLink)}</a>
                </div>
                <div class="comment-meta" style="margin-top:6px;justify-content:space-between;">
                    <small>${escapeHtml(commentDate)}</small>
                    <button class="delete-comment-btn" onclick="deleteComment(${comment.id})">Löschen</button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    document.getElementById("feed-content").innerHTML = html;
    document.querySelectorAll('.feed-selector button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('comments-btn').classList.add('active');
}

function formatGreeting() {
    const el = document.getElementById('greeting');
    if (el) el.innerHTML = formatStrikethrough(escapeHtml(el.textContent));
}

// ============================================
// START
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadCommentsFromSupabase();
    formatGreeting();
    const firstButton = document.querySelector('.feed-selector button:first-child');
    if (firstButton) loadFeed('deutschlandfunk', firstButton);
});
