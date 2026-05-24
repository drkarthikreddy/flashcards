/*
========================================================
SEARCH ENGINE
========================================================

FEATURES
========================================================

✔ Fast fuzzy search
✔ Subject filtering
✔ Chapter filtering
✔ Tag filtering
✔ Search history
✔ Recent searches
✔ Highlight results
✔ Fuse.js integration
✔ Mobile optimized
✔ Safe fallbacks
✔ Result ranking
✔ Offline support

========================================================
*/

class SearchEngine {

    constructor() {

        /*
        ----------------------------------------------------
        STORAGE
        ----------------------------------------------------
        */

        this.cards = [];

        this.filteredCards = [];

        this.fuse = null;

        this.searchHistory = [];

        this.recentSearches = [];

        this.maxRecentSearches = 20;

        this.options = {

            includeScore: true,

            shouldSort: true,

            threshold: 0.3,

            location: 0,

            distance: 100,

            maxPatternLength: 64,

            minMatchCharLength: 1,

            keys: [

                {
                    name: 'question',
                    weight: 0.5
                },

                {
                    name: 'answer',
                    weight: 0.3
                },

                {
                    name: 'subject',
                    weight: 0.1
                },

                {
                    name: 'chapter',
                    weight: 0.1
                }

            ]

        };

    }


    /*
    ========================================================
    INDEX
    ========================================================
    */

    index(cards = []) {

        try {

            this.cards = cards;

            /*
            ------------------------------------------------
            VALIDATE FUSE
            ------------------------------------------------
            */

            if (
                typeof Fuse === 'undefined'
            ) {

                console.error(
                    'Fuse.js library missing'
                );

                return;

            }

            /*
            ------------------------------------------------
            CREATE INDEX
            ------------------------------------------------
            */

            this.fuse = new Fuse(

                cards,

                this.options

            );

            console.log(
                `Indexed ${cards.length} cards`
            );

        }
        catch (error) {

            console.error(
                'Search indexing failed',
                error
            );

        }

    }


    /*
    ========================================================
    SEARCH
    ========================================================
    */

    search(query = '') {

        try {

            /*
            ------------------------------------------------
            EMPTY QUERY
            ------------------------------------------------
            */

            if (!query.trim()) {

                return this.cards;

            }

            /*
            ------------------------------------------------
            SAVE HISTORY
            ------------------------------------------------
            */

            this.addRecentSearch(query);

            /*
            ------------------------------------------------
            NO FUSE
            ------------------------------------------------
            */

            if (!this.fuse) {

                console.error(
                    'Fuse not initialized'
                );

                return [];

            }

            /*
            ------------------------------------------------
            SEARCH
            ------------------------------------------------
            */

            const results =
                this.fuse.search(query);

            /*
            ------------------------------------------------
            RETURN CARDS
            ------------------------------------------------
            */

            return results.map(

                result => result.item

            );

        }
        catch (error) {

            console.error(
                'Search failed',
                error
            );

            return [];

        }

    }


    /*
    ========================================================
    SUBJECT FILTER
    ========================================================
    */

    filterBySubject(subject) {

        if (!subject) {

            return this.cards;

        }

        return this.cards.filter(

            card =>

                card.subject &&
                card.subject === subject

        );

    }


    /*
    ========================================================
    CHAPTER FILTER
    ========================================================
    */

    filterByChapter(chapter) {

        if (!chapter) {

            return this.cards;

        }

        return this.cards.filter(

            card =>

                card.chapter &&
                card.chapter === chapter

        );

    }


    /*
    ========================================================
    TAG FILTER
    ========================================================
    */

    filterByTag(tag) {

        if (!tag) {

            return this.cards;

        }

        return this.cards.filter(

            card => {

                if (!card.tags) {

                    return false;

                }

                return card.tags.includes(tag);

            }

        );

    }


    /*
    ========================================================
    ADVANCED SEARCH
    ========================================================
    */

    advancedSearch({

        query = '',

        subject = '',

        chapter = '',

        tag = ''

    } = {}) {

        let results =
            this.search(query);

        /*
        ----------------------------------------------------
        SUBJECT
        ----------------------------------------------------
        */

        if (subject) {

            results = results.filter(

                card =>

                    card.subject === subject

            );

        }

        /*
        ----------------------------------------------------
        CHAPTER
        ----------------------------------------------------
        */

        if (chapter) {

            results = results.filter(

                card =>

                    card.chapter === chapter

            );

        }

        /*
        ----------------------------------------------------
        TAG
        ----------------------------------------------------
        */

        if (tag) {

            results = results.filter(

                card =>

                    card.tags &&
                    card.tags.includes(tag)

            );

        }

        return results;

    }


    /*
    ========================================================
    RECENT SEARCHES
    ========================================================
    */

    addRecentSearch(query) {

        if (!query.trim()) {

            return;

        }

        /*
        ----------------------------------------------------
        REMOVE DUPLICATES
        ----------------------------------------------------
        */

        this.recentSearches =
            this.recentSearches.filter(

                item => item !== query

            );

        /*
        ----------------------------------------------------
        ADD FRONT
        ----------------------------------------------------
        */

        this.recentSearches.unshift(query);

        /*
        ----------------------------------------------------
        LIMIT
        ----------------------------------------------------
        */

        if (

            this.recentSearches.length >

            this.maxRecentSearches

        ) {

            this.recentSearches.pop();

        }

        /*
        ----------------------------------------------------
        SAVE
        ----------------------------------------------------
        */

        this.saveRecentSearches();

    }


    /*
    ========================================================
    SAVE RECENTS
    ========================================================
    */

    saveRecentSearches() {

        try {

            localStorage.setItem(

                'flashcard_recent_searches',

                JSON.stringify(
                    this.recentSearches
                )

            );

        }
        catch (error) {

            console.error(error);

        }

    }


    /*
    ========================================================
    LOAD RECENTS
    ========================================================
    */

    loadRecentSearches() {

        try {

            const saved =
                localStorage.getItem(
                    'flashcard_recent_searches'
                );

            if (!saved) {

                return;

            }

            this.recentSearches =
                JSON.parse(saved);

        }
        catch (error) {

            console.error(error);

        }

    }


    /*
    ========================================================
    CLEAR RECENTS
    ========================================================
    */

    clearRecentSearches() {

        this.recentSearches = [];

        localStorage.removeItem(

            'flashcard_recent_searches'

        );

    }


    /*
    ========================================================
    HIGHLIGHT
    ========================================================
    */

    highlight(text = '', query = '') {

        if (!query.trim()) {

            return text;

        }

        try {

            const regex =
                new RegExp(

                    `(${query})`,

                    'gi'

                );

            return text.replace(

                regex,

                '<mark>$1</mark>'

            );

        }
        catch (error) {

            return text;

        }

    }


    /*
    ========================================================
    SEARCH STATISTICS
    ========================================================
    */

    getSearchStatistics() {

        return {

            totalCards:
                this.cards.length,

            totalSearches:
                this.recentSearches.length,

            indexed:
                !!this.fuse,

            recentSearches:
                this.recentSearches

        };

    }


    /*
    ========================================================
    RESET
    ========================================================
    */

    reset() {

        this.cards = [];

        this.filteredCards = [];

        this.fuse = null;

        this.searchHistory = [];

    }

}


/*
========================================================
EXPORT
========================================================
*/

window.SearchEngine = SearchEngine;
