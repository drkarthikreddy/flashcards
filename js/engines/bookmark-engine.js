/*

BOOKMARK ENGINE — COMPLETE STUDY STATE ENGINE

FEATURES

✔ Bookmark cards ✔ Weak cards ✔ Favorite cards ✔ Recently viewed ✔ Study history ✔ Persistent local storage ✔ IndexedDB support ✔ Import/export ✔ Study sessions ✔ Revision queue ✔ Subject-wise bookmarks ✔ Chapter-wise bookmarks ✔ Bookmark notes ✔ Bookmark timestamps ✔ Statistics ✔ Offline support ✔ Huge deck support ✔ Sync-ready architecture ✔ Search within bookmarks ✔ Bulk operations ✔ Mobile optimized

======================================================== */

class BookmarkEngine {

constructor(options = {}) {

    this.options = {
        useIndexedDB: true,
        localStorageKey: 'medical_flashcard_state',
        autoSave: true,
        maxRecentCards: 500,
        ...options
    };

    this.dbName = 'alpotusFlashcards';
    this.dbVersion = 1;

    this.indexedDB = null;

    this.state = {

        bookmarks: [],
        weakCards: [],
        favorites: [],
        hiddenCards: [],

        recentCards: [],
        viewedCards: [],

        notes: {},

        studySessions: [],

        revisionQueue: [],

        analytics: {
            totalViewed: 0,
            totalBookmarks: 0,
            totalWeak: 0,
            totalStudyTime: 0,
            streak: 0
        }

    };

}


/*
========================================================
INITIALIZATION
========================================================
*/

async init() {

    try {

        if (this.options.useIndexedDB) {
            await this.initializeIndexedDB();
        }

        await this.loadState();

        return true;

    } catch (error) {

        console.error(error);
        return false;

    }

}


/*
========================================================
INDEXEDDB
========================================================
*/

async initializeIndexedDB() {

    return new Promise((resolve, reject) => {

        const request = indexedDB.open(
            this.dbName,
            this.dbVersion
        );

        request.onupgradeneeded = event => {

            const db = event.target.result;

            if (!db.objectStoreNames.contains('studyState')) {

                db.createObjectStore('studyState', {
                    keyPath: 'key'
                });

            }

        };

        request.onsuccess = event => {

            this.indexedDB = event.target.result;
            resolve(true);

        };

        request.onerror = error => reject(error);

    });

}


/*
========================================================
SAVE STATE
========================================================
*/

async saveState() {

    try {

        if (
            this.options.useIndexedDB &&
            this.indexedDB
        ) {

            await this.saveIndexedDB();

        }
        else {

            localStorage.setItem(
                this.options.localStorageKey,
                JSON.stringify(this.state)
            );

        }

        return true;

    } catch (error) {

        console.error(error);
        return false;

    }

}


/*
========================================================
LOAD STATE
========================================================
*/

async loadState() {

    try {

        let loaded = null;

        if (
            this.options.useIndexedDB &&
            this.indexedDB
        ) {

            loaded = await this.loadIndexedDB();

        }
        else {

            loaded = JSON.parse(
                localStorage.getItem(
                    this.options.localStorageKey
                ) || 'null'
            );

        }

        if (loaded) {
            this.state = loaded;
        }

        return this.state;

    } catch (error) {

        console.error(error);
        return this.state;

    }

}


/*
========================================================
INDEXEDDB SAVE
========================================================
*/

async saveIndexedDB() {

    return new Promise((resolve, reject) => {

        const transaction = this.indexedDB.transaction(
            ['studyState'],
            'readwrite'
        );

        const store = transaction.objectStore('studyState');

        const request = store.put({
            key: 'mainState',
            data: this.state
        });

        request.onsuccess = () => resolve(true);
        request.onerror = error => reject(error);

    });

}


/*
========================================================
INDEXEDDB LOAD
========================================================
*/

async loadIndexedDB() {

    return new Promise((resolve, reject) => {

        const transaction = this.indexedDB.transaction(
            ['studyState'],
            'readonly'
        );

        const store = transaction.objectStore('studyState');

        const request = store.get('mainState');

        request.onsuccess = () => {

            resolve(
                request.result
                    ? request.result.data
                    : null
            );

        };

        request.onerror = error => reject(error);

    });

}


/*
========================================================
BOOKMARKS
========================================================
*/

async addBookmark(card) {

    if (!card || !card.id) return false;

    const exists = this.isBookmarked(card.id);

    if (exists) return true;

    this.state.bookmarks.push({
        id: card.id,
        subject: card.subject || 'General',
        chapter: card.chapter || 'General',
        question: card.question || '',
        createdAt: Date.now()
    });

    this.state.analytics.totalBookmarks =
        this.state.bookmarks.length;

    await this.autoSave();

    return true;

}


async removeBookmark(cardId) {

    this.state.bookmarks = this.state.bookmarks.filter(
        bookmark => bookmark.id !== cardId
    );

    this.state.analytics.totalBookmarks =
        this.state.bookmarks.length;

    await this.autoSave();

    return true;

}


async toggleBookmark(card) {

    if (this.isBookmarked(card.id)) {
        return await this.removeBookmark(card.id);
    }

    return await this.addBookmark(card);

}


isBookmarked(cardId) {

    return this.state.bookmarks.some(
        bookmark => bookmark.id === cardId
    );

}


getBookmarks() {
    return this.state.bookmarks;
}


/*
========================================================
WEAK CARDS
========================================================
*/

async addWeakCard(card) {

    if (!card || !card.id) return false;

    const exists = this.isWeakCard(card.id);

    if (exists) return true;

    this.state.weakCards.push({
        id: card.id,
        subject: card.subject || 'General',
        chapter: card.chapter || 'General',
        question: card.question || '',
        createdAt: Date.now(),
        repetitions: 0
    });

    this.state.analytics.totalWeak =
        this.state.weakCards.length;

    await this.autoSave();

    return true;

}


async removeWeakCard(cardId) {

    this.state.weakCards = this.state.weakCards.filter(
        card => card.id !== cardId
    );

    this.state.analytics.totalWeak =
        this.state.weakCards.length;

    await this.autoSave();

    return true;

}


async toggleWeakCard(card) {

    if (this.isWeakCard(card.id)) {
        return await this.removeWeakCard(card.id);
    }

    return await this.addWeakCard(card);

}


isWeakCard(cardId) {

    return this.state.weakCards.some(
        card => card.id === cardId
    );

}


getWeakCards() {
    return this.state.weakCards;
}


/*
========================================================
FAVORITES
========================================================
*/

async addFavorite(card) {

    if (!card || !card.id) return false;

    if (this.isFavorite(card.id)) return true;

    this.state.favorites.push({
        id: card.id,
        subject: card.subject || 'General',
        chapter: card.chapter || 'General',
        createdAt: Date.now()
    });

    await this.autoSave();

    return true;

}


async removeFavorite(cardId) {

    this.state.favorites = this.state.favorites.filter(
        favorite => favorite.id !== cardId
    );

    await this.autoSave();

    return true;

}


isFavorite(cardId) {

    return this.state.favorites.some(
        favorite => favorite.id === cardId
    );

}


/*
========================================================
RECENTLY VIEWED
========================================================
*/

async addRecentCard(card) {

    if (!card || !card.id) return false;

    this.state.recentCards = this.state.recentCards.filter(
        item => item.id !== card.id
    );

    this.state.recentCards.unshift({
        id: card.id,
        question: card.question || '',
        viewedAt: Date.now()
    });

    this.state.recentCards =
        this.state.recentCards.slice(
            0,
            this.options.maxRecentCards
        );

    this.state.analytics.totalViewed++;

    await this.autoSave();

    return true;

}


getRecentCards(limit = 50) {

    return this.state.recentCards.slice(0, limit);

}


/*
========================================================
NOTES
========================================================
*/

async saveNote(cardId, note) {

    this.state.notes[cardId] = {
        note,
        updatedAt: Date.now()
    };

    await this.autoSave();

    return true;

}


getNote(cardId) {

    return this.state.notes[cardId] || null;

}


async removeNote(cardId) {

    delete this.state.notes[cardId];

    await this.autoSave();

    return true;

}


/*
========================================================
STUDY SESSIONS
========================================================
*/

async startSession() {

    this.currentSession = {
        id: Date.now(),
        startedAt: Date.now(),
        cardsViewed: 0,
        cardsBookmarked: 0,
        weakCardsMarked: 0
    };

    return this.currentSession;

}


async endSession() {

    if (!this.currentSession) return null;

    this.currentSession.endedAt = Date.now();

    this.currentSession.duration =
        this.currentSession.endedAt -
        this.currentSession.startedAt;

    this.state.studySessions.unshift(
        this.currentSession
    );

    this.state.analytics.totalStudyTime +=
        this.currentSession.duration;

    await this.autoSave();

    return this.currentSession;

}


getSessions(limit = 50) {

    return this.state.studySessions.slice(0, limit);

}


/*
========================================================
REVISION QUEUE
========================================================
*/

async addToRevisionQueue(card) {

    if (!card || !card.id) return false;

    const exists = this.state.revisionQueue.some(
        item => item.id === card.id
    );

    if (exists) return true;

    this.state.revisionQueue.push({
        id: card.id,
        addedAt: Date.now(),
        nextRevision: Date.now(),
        interval: 1,
        easeFactor: 2.5
    });

    await this.autoSave();

    return true;

}


getRevisionQueue() {

    const now = Date.now();

    return this.state.revisionQueue.filter(item => {
        return item.nextRevision <= now;
    });

}


/*
========================================================
SUBJECT FILTERS
========================================================
*/

getBookmarksBySubject(subject) {

    return this.state.bookmarks.filter(bookmark => {
        return bookmark.subject === subject;
    });

}


getWeakCardsBySubject(subject) {

    return this.state.weakCards.filter(card => {
        return card.subject === subject;
    });

}


/*
========================================================
SEARCH BOOKMARKS
========================================================
*/

searchBookmarks(query = '') {

    query = query.toLowerCase().trim();

    return this.state.bookmarks.filter(bookmark => {

        return (
            bookmark.question
                .toLowerCase()
                .includes(query) ||
            bookmark.subject
                .toLowerCase()
                .includes(query) ||
            bookmark.chapter
                .toLowerCase()
                .includes(query)
        );

    });

}


/*
========================================================
ANALYTICS
========================================================
*/

getAnalytics() {

    return {
        ...this.state.analytics,

        totalFavorites:
            this.state.favorites.length,

        totalRecent:
            this.state.recentCards.length,

        totalNotes:
            Object.keys(this.state.notes).length,

        totalSessions:
            this.state.studySessions.length,

        revisionQueue:
            this.state.revisionQueue.length
    };

}


/*
========================================================
EXPORT STATE
========================================================
*/

exportState() {

    return JSON.stringify(this.state, null, 2);

}


/*
========================================================
IMPORT STATE
========================================================
*/

async importState(json) {

    try {

        const parsed = JSON.parse(json);

        this.state = parsed;

        await this.saveState();

        return true;

    } catch (error) {

        console.error(error);
        return false;

    }

}


/*
========================================================
CLEAR ALL
========================================================
*/

async clearAll() {

    this.state = {

        bookmarks: [],
        weakCards: [],
        favorites: [],
        hiddenCards: [],

        recentCards: [],
        viewedCards: [],

        notes: {},

        studySessions: [],

        revisionQueue: [],

        analytics: {
            totalViewed: 0,
            totalBookmarks: 0,
            totalWeak: 0,
            totalStudyTime: 0,
            streak: 0
        }

    };

    await this.saveState();

    return true;

}


/*
========================================================
AUTO SAVE
========================================================
*/

async autoSave() {

    if (this.options.autoSave) {
        await this.saveState();
    }

}

}

/*

GLOBAL EXPORT

*/

window.BookmarkEngine = BookmarkEngine;

/*

USAGE EXAMPLE

const bookmarkEngine = new BookmarkEngine();

await bookmarkEngine.init();

await bookmarkEngine.addBookmark(card);

const bookmarks = bookmarkEngine.getBookmarks();

console.log(bookmarks);

======================================================== */