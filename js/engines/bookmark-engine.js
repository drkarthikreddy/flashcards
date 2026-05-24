/*
========================================================
BOOKMARK ENGINE
========================================================

FEATURES
========================================================

✔ Add bookmarks
✔ Remove bookmarks
✔ Toggle bookmarks
✔ Check bookmark status
✔ LocalStorage persistence
✔ Export bookmarks
✔ Import bookmarks
✔ Clear bookmarks
✔ Bookmark statistics
✔ Offline support
✔ Safe fallbacks
✔ Mobile optimized

========================================================
*/

(function () {

    /*
    ========================================================
    ENGINE
    ========================================================
    */

    function BookmarkEngine() {

        /*
        ----------------------------------------------------
        STORAGE
        ----------------------------------------------------
        */

        this.bookmarks = [];

        this.storageKey =
            'flashcard_bookmarks';

        /*
        ----------------------------------------------------
        LOAD SAVED
        ----------------------------------------------------
        */

        this.loadBookmarks();

    }


    /*
    ========================================================
    LOAD BOOKMARKS
    ========================================================
    */

    BookmarkEngine.prototype.loadBookmarks =
        function () {

        try {

            var saved =
                localStorage.getItem(
                    this.storageKey
                );

            if (!saved) {

                this.bookmarks = [];

                return;

            }

            this.bookmarks =
                JSON.parse(saved);

            /*
            ------------------------------------------------
            VALIDATE ARRAY
            ------------------------------------------------
            */

            if (
                !Array.isArray(
                    this.bookmarks
                )
            ) {

                this.bookmarks = [];

            }

        }
        catch (error) {

            console.error(
                'Failed to load bookmarks',
                error
            );

            this.bookmarks = [];

        }

    };


    /*
    ========================================================
    SAVE BOOKMARKS
    ========================================================
    */

    BookmarkEngine.prototype.saveBookmarks =
        function () {

        try {

            localStorage.setItem(

                this.storageKey,

                JSON.stringify(
                    this.bookmarks
                )

            );

        }
        catch (error) {

            console.error(
                'Failed to save bookmarks',
                error
            );

        }

    };


    /*
    ========================================================
    ADD BOOKMARK
    ========================================================
    */

    BookmarkEngine.prototype.addBookmark =
        function (cardId) {

        try {

            if (
                !cardId
            ) {

                return false;

            }

            /*
            ------------------------------------------------
            AVOID DUPLICATES
            ------------------------------------------------
            */

            if (

                this.bookmarks.indexOf(
                    cardId
                ) !== -1

            ) {

                return false;

            }

            /*
            ------------------------------------------------
            ADD
            ------------------------------------------------
            */

            this.bookmarks.push(cardId);

            /*
            ------------------------------------------------
            SAVE
            ------------------------------------------------
            */

            this.saveBookmarks();

            return true;

        }
        catch (error) {

            console.error(error);

            return false;

        }

    };


    /*
    ========================================================
    REMOVE BOOKMARK
    ========================================================
    */

    BookmarkEngine.prototype.removeBookmark =
        function (cardId) {

        try {

            this.bookmarks =
                this.bookmarks.filter(

                    function (id) {

                        return id !== cardId;

                    }

                );

            this.saveBookmarks();

            return true;

        }
        catch (error) {

            console.error(error);

            return false;

        }

    };


    /*
    ========================================================
    TOGGLE BOOKMARK
    ========================================================
    */

    BookmarkEngine.prototype.toggleBookmark =
        function (cardId) {

        try {

            if (

                this.isBookmarked(
                    cardId
                )

            ) {

                this.removeBookmark(
                    cardId
                );

                return false;

            }

            this.addBookmark(cardId);

            return true;

        }
        catch (error) {

            console.error(error);

            return false;

        }

    };


    /*
    ========================================================
    CHECK BOOKMARK
    ========================================================
    */

    BookmarkEngine.prototype.isBookmarked =
        function (cardId) {

        try {

            return (

                this.bookmarks.indexOf(
                    cardId
                ) !== -1

            );

        }
        catch (error) {

            console.error(error);

            return false;

        }

    };


    /*
    ========================================================
    GET ALL BOOKMARKS
    ========================================================
    */

    BookmarkEngine.prototype.getBookmarks =
        function () {

        return this.bookmarks;

    };


    /*
    ========================================================
    GET BOOKMARKED CARDS
    ========================================================
    */

    BookmarkEngine.prototype.getBookmarkedCards =
        function (cards) {

        try {

            if (
                !Array.isArray(cards)
            ) {

                return [];

            }

            return cards.filter(

                function (card) {

                    return (
                        this.bookmarks.indexOf(
                            card.id
                        ) !== -1
                    );

                }.bind(this)

            );

        }
        catch (error) {

            console.error(error);

            return [];

        }

    };


    /*
    ========================================================
    CLEAR BOOKMARKS
    ========================================================
    */

    BookmarkEngine.prototype.clearBookmarks =
        function () {

        try {

            this.bookmarks = [];

            this.saveBookmarks();

            return true;

        }
        catch (error) {

            console.error(error);

            return false;

        }

    };


    /*
    ========================================================
    EXPORT BOOKMARKS
    ========================================================
    */

    BookmarkEngine.prototype.exportBookmarks =
        function () {

        try {

            return JSON.stringify({

                bookmarks:
                    this.bookmarks,

                exportedAt:
                    new Date()
                        .toISOString()

            });

        }
        catch (error) {

            console.error(error);

            return null;

        }

    };


    /*
    ========================================================
    IMPORT BOOKMARKS
    ========================================================
    */

    BookmarkEngine.prototype.importBookmarks =
        function (jsonData) {

        try {

            var data =
                JSON.parse(jsonData);

            if (
                !data.bookmarks
            ) {

                return false;

            }

            if (
                !Array.isArray(
                    data.bookmarks
                )
            ) {

                return false;

            }

            this.bookmarks =
                data.bookmarks;

            this.saveBookmarks();

            return true;

        }
        catch (error) {

            console.error(error);

            return false;

        }

    };


    /*
    ========================================================
    STATISTICS
    ========================================================
    */

    BookmarkEngine.prototype.getStatistics =
        function () {

        return {

            totalBookmarks:
                this.bookmarks.length,

            storageKey:
                this.storageKey,

            saved:
                true

        };

    };


    /*
    ========================================================
    RESET
    ========================================================
    */

    BookmarkEngine.prototype.reset =
        function () {

        this.bookmarks = [];

    };


    /*
    ========================================================
    EXPORT
    ========================================================
    */

    window.BookmarkEngine =
        BookmarkEngine;

})();
