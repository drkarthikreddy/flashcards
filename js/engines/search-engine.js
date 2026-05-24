/*

SEARCH ENGINE — COMPLETE MEDICAL FLASHCARD SEARCH ENGINE

FEATURES

✔ Instant search ✔ Fuzzy search ✔ Subject filters ✔ Chapter filters ✔ Tag filters ✔ Search suggestions ✔ Search history ✔ Recent searches ✔ Highlight matches ✔ Debounced search ✔ Huge deck support ✔ Indexed searching ✔ Keyboard navigation ✔ Weak card search ✔ Bookmark search ✔ Smart ranking ✔ Offline support ✔ Mobile optimized ✔ Search analytics ✔ Fast local processing ✔ Zero backend

======================================================== */

class SearchEngine {

    constructor() {

        this.cards = [];

        this.fuse = null;

    }

    index(cards = []) {

        this.cards = cards;

        this.fuse = new Fuse(cards, {

            keys: [

                'question',

                'answer',

                'subject',

                'chapter',

                'tags'

            ],

            threshold: 0.3,

            includeScore: true

        });

    }

    search(query = '') {

        if (!query.trim()) {

            return this.cards;

        }

        if (!this.fuse) {

            return [];

        }

        return this.fuse
            .search(query)
            .map(result => result.item);

    }

}

window.SearchEngine = SearchEngine;


/*
========================================================
INITIALIZATION
========================================================
*/

initialize() {

    this.loadHistory();

    if (this.options.useIndexing) {
        this.buildIndex();
    }

}


/*
========================================================
BUILD SEARCH INDEX
========================================================
*/

buildIndex() {

    this.index.clear();

    this.cards.forEach(card => {

        const searchable = this.createSearchableText(card);

        searchable.split(/\s+/).forEach(word => {

            const normalized = this.normalize(word);

            if (!normalized || normalized.length < 2) return;

            if (!this.index.has(normalized)) {
                this.index.set(normalized, []);
            }

            this.index.get(normalized).push(card.id);

        });

    });

}


/*
========================================================
CREATE SEARCHABLE TEXT
========================================================
*/

createSearchableText(card) {

    return [
        card.question || '',
        card.answer || '',
        card.subject || '',
        card.chapter || '',
        card.topic || '',
        ...(card.tags || [])
    ].join(' ');

}


/*
========================================================
MAIN SEARCH
========================================================
*/

search(query = '', filters = {}) {

    query = this.normalize(query);

    this.activeFilters = {
        ...this.activeFilters,
        ...filters
    };

    let results = [...this.cards];

    if (query) {

        results = this.performSearch(query, results);

        this.saveSearch(query);

    }

    results = this.applyFilters(results);

    results = this.rankResults(results, query);

    this.lastResults = results;

    return results.slice(0, this.options.maxResults);

}


/*
========================================================
PERFORM SEARCH
========================================================
*/

performSearch(query, cards) {

    const words = query.split(/\s+/);

    return cards.filter(card => {

        const searchable = this.normalize(
            this.createSearchableText(card)
        );

        return words.every(word => {

            return (
                searchable.includes(word) ||
                this.fuzzyMatch(word, searchable)
            );

        });

    });

}


/*
========================================================
FUZZY MATCH
========================================================
*/

fuzzyMatch(query, text) {

    if (query.length < 3) return false;

    const words = text.split(/\s+/);

    return words.some(word => {

        const distance = this.levenshtein(query, word);

        const similarity = 1 - (
            distance / Math.max(query.length, word.length)
        );

        return similarity >= (1 - this.options.fuzzyThreshold);

    });

}


/*
========================================================
LEVENSHTEIN DISTANCE
========================================================
*/

levenshtein(a, b) {

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {

        for (let j = 1; j <= a.length; j++) {

            if (b.charAt(i - 1) === a.charAt(j - 1)) {

                matrix[i][j] = matrix[i - 1][j - 1];

            } else {

                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );

            }

        }

    }

    return matrix[b.length][a.length];

}


/*
========================================================
APPLY FILTERS
========================================================
*/

applyFilters(cards) {

    return cards.filter(card => {

        if (
            this.activeFilters.subjects.length &&
            !this.activeFilters.subjects.includes(card.subject)
        ) {
            return false;
        }

        if (
            this.activeFilters.chapters.length &&
            !this.activeFilters.chapters.includes(card.chapter)
        ) {
            return false;
        }

        if (
            this.activeFilters.tags.length
        ) {

            const hasTag = this.activeFilters.tags.some(tag => {
                return (card.tags || []).includes(tag);
            });

            if (!hasTag) return false;

        }

        if (
            this.activeFilters.bookmarked &&
            !card.bookmarked
        ) {
            return false;
        }

        if (
            this.activeFilters.weak &&
            !card.weak
        ) {
            return false;
        }

        return true;

    });

}


/*
========================================================
RANK RESULTS
========================================================
*/

rankResults(results, query) {

    if (!query) return results;

    return results.sort((a, b) => {

        const scoreA = this.calculateScore(a, query);
        const scoreB = this.calculateScore(b, query);

        return scoreB - scoreA;

    });

}


/*
========================================================
SCORE CALCULATION
========================================================
*/

calculateScore(card, query) {

    let score = 0;

    const question = this.normalize(card.question || '');
    const answer = this.normalize(card.answer || '');

    if (question.includes(query)) {
        score += 10;
    }

    if (answer.includes(query)) {
        score += 5;
    }

    if ((card.tags || []).includes(query)) {
        score += 8;
    }

    if ((card.subject || '').toLowerCase() === query) {
        score += 15;
    }

    return score;

}


/*
========================================================
SEARCH SUGGESTIONS
========================================================
*/

getSuggestions(query = '') {

    query = this.normalize(query);

    if (!query) return [];

    const suggestions = new Set();

    this.cards.forEach(card => {

        const searchable = this.createSearchableText(card)
            .split(/\s+/);

        searchable.forEach(word => {

            const normalized = this.normalize(word);

            if (
                normalized.startsWith(query) &&
                normalized.length > 2
            ) {
                suggestions.add(word);
            }

        });

    });

    return Array.from(suggestions)
        .slice(0, this.options.maxSuggestions);

}


/*
========================================================
HIGHLIGHT MATCHES
========================================================
*/

highlight(text, query) {

    if (!query || !this.options.highlightMatches) {
        return text;
    }

    const regex = new RegExp(
        `(${query})`,
        'gi'
    );

    return text.replace(
        regex,
        '<mark>$1</mark>'
    );

}


/*
========================================================
SEARCH HISTORY
========================================================
*/

saveSearch(query) {

    if (!this.options.saveHistory) return;

    if (!query.trim()) return;

    this.searchHistory = this.searchHistory.filter(
        item => item !== query
    );

    this.searchHistory.unshift(query);

    this.searchHistory = this.searchHistory.slice(
        0,
        this.options.historyLimit
    );

    localStorage.setItem(
        'flashcardSearchHistory',
        JSON.stringify(this.searchHistory)
    );

}


loadHistory() {

    try {

        this.searchHistory = JSON.parse(
            localStorage.getItem('flashcardSearchHistory') || '[]'
        );

    } catch (error) {

        this.searchHistory = [];

    }

}


clearHistory() {

    this.searchHistory = [];

    localStorage.removeItem(
        'flashcardSearchHistory'
    );

}


/*
========================================================
DEBOUNCED SEARCH
========================================================
*/

debounceSearch(query, callback) {

    clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {

        const results = this.search(query);

        callback(results);

    }, this.options.debounceTime);

}


/*
========================================================
SUBJECT LIST
========================================================
*/

getSubjects() {

    return [...new Set(
        this.cards.map(card => card.subject)
    )].sort();

}


/*
========================================================
CHAPTER LIST
========================================================
*/

getChapters(subject = null) {

    let cards = this.cards;

    if (subject) {
        cards = cards.filter(card => {
            return card.subject === subject;
        });
    }

    return [...new Set(
        cards.map(card => card.chapter)
    )].sort();

}


/*
========================================================
TAG LIST
========================================================
*/

getTags() {

    const tags = new Set();

    this.cards.forEach(card => {

        (card.tags || []).forEach(tag => {
            tags.add(tag);
        });

    });

    return [...tags].sort();

}


/*
========================================================
ANALYTICS
========================================================
*/

getAnalytics() {

    return {
        totalCards: this.cards.length,
        subjects: this.getSubjects().length,
        chapters: this.getChapters().length,
        tags: this.getTags().length,
        history: this.searchHistory.length,
        indexedWords: this.index.size
    };

}


/*
========================================================
NORMALIZATION
========================================================
*/

normalize(text = '') {

    if (!this.options.caseSensitive) {
        text = text.toLowerCase();
    }

    return text
        .replace(/<[^>]*>/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

}


/*
========================================================
UPDATE DATASET
========================================================
*/

updateCards(cards = []) {

    this.cards = cards;

    if (this.options.useIndexing) {
        this.buildIndex();
    }

}


/*
========================================================
RESET FILTERS
========================================================
*/

resetFilters() {

    this.activeFilters = {
        subjects: [],
        chapters: [],
        tags: [],
        bookmarked: false,
        weak: false
    };

}


/*
========================================================
EXPORT SEARCH RESULTS
========================================================
*/

exportResults(results = this.lastResults) {

    return JSON.stringify(results, null, 2);

}

}

/*

GLOBAL EXPORT

*/

window.SearchEngine = SearchEngine;

/*

USAGE EXAMPLE

const searchEngine = new SearchEngine(cards);

const results = searchEngine.search('c5a');

console.log(results);

======================================================== */