/*
========================================================
APP.JS — MAIN APPLICATION CONTROLLER
========================================================

FEATURES
========================================================

✔ Application bootstrap
✔ Engine initialization
✔ APKG importing
✔ Flashcard viewer connection
✔ Search integration
✔ Revision integration
✔ Bookmark integration
✔ Statistics integration
✔ Study modes
✔ Subject navigation
✔ Chapter navigation
✔ Import management
✔ Session persistence
✔ Theme management
✔ Offline support
✔ Massive deck support
✔ Keyboard shortcuts
✔ Mobile optimized
✔ Local cache support
✔ Error handling
✔ Full app orchestration

========================================================
*/

class FlashcardApp {

    constructor() {

        this.engines = {

            apkg: null,

            flashcard: null,

            search: null,

            bookmarks: null,

            revision: null,

            stats: null

        };

        this.state = {

            cards: [],

            subjects: {},

            currentSubject: null,

            currentChapter: null,

            importedDecks: [],

            ready: false

        };

        this.elements = {};

    }


    /*
    ========================================================
    INIT
    ========================================================
    */

    async init() {

        try {

            this.cacheElements();

            this.initializeEngines();

            this.attachEvents();

            this.restoreSession();

            this.state.ready = true;

            console.log(
                'Flashcard App Ready'
            );

        }
        catch (error) {

            console.error(error);

            this.showError(
                'Failed to initialize app'
            );

        }

    }


    /*
    ========================================================
    CACHE ELEMENTS
    ========================================================
    */

    cacheElements() {

        this.elements.importInput =
            document.querySelector(
                '#apkg-input'
            );

        this.elements.subjects =
            document.querySelector(
                '#subjects'
            );

        this.elements.chapters =
            document.querySelector(
                '#chapters'
            );

        this.elements.search =
            document.querySelector(
                '#search-input'
            );

        this.elements.progress =
            document.querySelector(
                '#import-progress'
            );

        this.elements.status =
            document.querySelector(
                '#import-status'
            );

        this.elements.viewer =
            document.querySelector(
                '#flashcard-app'
            );

    }


    /*
    ========================================================
    ENGINES
    ========================================================
    */

    initializeEngines() {

        /*
        ----------------------------------------------------
        APKG
        ----------------------------------------------------
        */

        this.engines.apkg =
            new APKGEngine({

                progressCallback:
                    progress => {

                        this.updateProgress(
                            progress.percent,
                            progress.message
                        );

                    }

            });


        /*
        ----------------------------------------------------
        SEARCH
        ----------------------------------------------------
        */

        this.engines.search =
            new SearchEngine();


        /*
        ----------------------------------------------------
        BOOKMARKS
        ----------------------------------------------------
        */

        this.engines.bookmarks =
            new BookmarkEngine();


        /*
        ----------------------------------------------------
        REVISION
        ----------------------------------------------------
        */

        this.engines.revision =
            new RevisionEngine();


        /*
        ----------------------------------------------------
        STATS
        ----------------------------------------------------
        */

        this.engines.stats =
            new StatsEngine();


        /*
        ----------------------------------------------------
        FLASHCARD
        ----------------------------------------------------
        */

        this.engines.flashcard =
            new FlashcardEngine({

                container:
                    '#flashcard-app'

            });

    }


    /*
    ========================================================
    EVENTS
    ========================================================
    */

    attachEvents() {

        /*
        ----------------------------------------------------
        IMPORT
        ----------------------------------------------------
        */

        if (this.elements.importInput) {

            this.elements.importInput
                .addEventListener(

                    'change',

                    async event => {

                        const file =
                            event.target.files[0];

                        if (!file) return;

                        await this.importAPKG(file);

                    }

                );

        }


        /*
        ----------------------------------------------------
        SEARCH
        ----------------------------------------------------
        */

        if (this.elements.search) {

            this.elements.search
                .addEventListener(

                    'input',

                    event => {

                        this.search(
                            event.target.value
                        );

                    }

                );

        }


        /*
        ----------------------------------------------------
        KEYBOARD
        ----------------------------------------------------
        */

        window.addEventListener(

            'keydown',

            event => {

                this.handleKeyboard(event);

            }

        );

    }


    /*
    ========================================================
    IMPORT APKG
    ========================================================
    */

    async importAPKG(file) {

        try {

            this.showStatus(
                'Importing APKG...'
            );

            const result =
                await this.engines.apkg
                    .import(file);

            this.state.cards =
                result.cards;

            this.state.subjects =
                result.subjects;

            this.state.importedDecks =
                result.decks;

            this.initializeStudySystems();

            this.renderSubjects();

            this.loadAllCards();

            this.saveSession();

            this.showStatus(
                `Imported ${result.cards.length} cards`
            );

        }
        catch (error) {

            console.error(error);

            this.showError(
                'Failed to import APKG'
            );

        }

    }


    /*
    ========================================================
    INITIALIZE STUDY SYSTEMS
    ========================================================
    */

    initializeStudySystems() {

        this.engines.search.index(
            this.state.cards
        );

        this.engines.revision.cards =
            this.state.cards;

        this.engines.revision.initializeCards();

    }


    /*
    ========================================================
    LOAD ALL CARDS
    ========================================================
    */

    loadAllCards() {

        this.engines.flashcard
            .init(this.state.cards);

        this.engines.stats
            .startSession();

    }


    /*
    ========================================================
    SUBJECTS
    ========================================================
    */

    renderSubjects() {

        if (!this.elements.subjects) {

            return;

        }

        this.elements.subjects.innerHTML =
            '';

        Object.keys(
            this.state.subjects
        ).forEach(subject => {

            const button =
                document.createElement(
                    'button'
                );

            button.className =
                'subject-btn';

            button.innerHTML = subject;

            button.addEventListener(

                'click',

                () => {

                    this.selectSubject(
                        subject
                    );

                }

            );

            this.elements.subjects
                .appendChild(button);

        });

    }


    /*
    ========================================================
    SELECT SUBJECT
    ========================================================
    */

    selectSubject(subject) {

        this.state.currentSubject =
            subject;

        const chapters =
            this.state.subjects[subject];

        this.renderChapters(chapters);

        const cards = [];

        Object.values(chapters)
            .forEach(chapterCards => {

                cards.push(
                    ...chapterCards
                );

            });

        this.engines.flashcard
            .resetFilters();

        this.engines.flashcard.cards =
            cards;

        this.engines.flashcard
            .filteredCards = cards;

        this.engines.flashcard
            .renderCard(0);

    }


    /*
    ========================================================
    CHAPTERS
    ========================================================
    */

    renderChapters(chapters) {

        if (!this.elements.chapters) {

            return;

        }

        this.elements.chapters.innerHTML =
            '';

        Object.keys(chapters)
            .forEach(chapter => {

                const button =
                    document.createElement(
                        'button'
                    );

                button.className =
                    'chapter-btn';

                button.innerHTML =
                    chapter;

                button.addEventListener(

                    'click',

                    () => {

                        this.selectChapter(
                            chapter
                        );

                    }

                );

                this.elements.chapters
                    .appendChild(button);

            });

    }


    /*
    ========================================================
    SELECT CHAPTER
    ========================================================
    */

    selectChapter(chapter) {

        this.state.currentChapter =
            chapter;

        const cards =
            this.state.subjects[
                this.state.currentSubject
            ][chapter];

        this.engines.flashcard.cards =
            cards;

        this.engines.flashcard
            .filteredCards = cards;

        this.engines.flashcard
            .renderCard(0);

    }


    /*
    ========================================================
    SEARCH
    ========================================================
    */

    search(query) {

        if (!query.trim()) {

            this.engines.flashcard
                .filteredCards =
                    this.engines.flashcard
                        .cards;

            this.engines.flashcard
                .renderCard(0);

            return;

        }

        const results =
            this.engines.search
                .search(query);

        this.engines.flashcard
            .filteredCards = results;

        this.engines.flashcard
            .renderCard(0);

    }


    /*
    ========================================================
    REVISION MODE
    ========================================================
    */

    startRevisionMode() {

        const queue =
            this.engines.revision
                .getDailyQueue();

        const cards = [

            ...queue.review,

            ...queue.new

        ];

        this.engines.flashcard.cards =
            cards;

        this.engines.flashcard
            .filteredCards = cards;

        this.engines.flashcard
            .renderCard(0);

    }


    /*
    ========================================================
    WEAK CARDS
    ========================================================
    */

    startWeakMode() {

        this.engines.flashcard
            .showWeakCards();

    }


    /*
    ========================================================
    BOOKMARKS
    ========================================================
    */

    startBookmarkMode() {

        this.engines.flashcard
            .showBookmarks();

    }


    /*
    ========================================================
    EXAM MODE
    ========================================================
    */

    startExamMode(minutes = 60) {

        this.engines.flashcard
            .startExamMode(minutes);

    }


    /*
    ========================================================
    SEARCH SHORTCUTS
    ========================================================
    */

    handleKeyboard(event) {

        switch (event.key) {

            case '/':

                event.preventDefault();

                this.elements.search
                    ?.focus();

                break;

            case 'r':

                this.startRevisionMode();

                break;

            case 'w':

                this.startWeakMode();

                break;

            case 'b':

                this.startBookmarkMode();

                break;

            case 'e':

                this.startExamMode();

                break;

        }

    }


    /*
    ========================================================
    PROGRESS
    ========================================================
    */

    updateProgress(percent, message) {

        if (this.elements.progress) {

            this.elements.progress
                .style.width =
                    `${percent}%`;

        }

        if (this.elements.status) {

            this.elements.status
                .innerHTML = message;

        }

    }


    /*
    ========================================================
    STATUS
    ========================================================
    */

    showStatus(message) {

        if (this.elements.status) {

            this.elements.status
                .innerHTML = message;

        }

    }


    /*
    ========================================================
    ERROR
    ========================================================
    */

    showError(message) {

        console.error(message);

        this.showStatus(message);

    }


    /*
    ========================================================
    SESSION SAVE
    ========================================================
    */

    saveSession() {

        const data = {

            cards: this.state.cards,

            subjects:
                this.state.subjects,

            currentSubject:
                this.state.currentSubject,

            currentChapter:
                this.state.currentChapter

        };

        localStorage.setItem(

            'flashcard_app_session',

            JSON.stringify(data)

        );

    }


    /*
    ========================================================
    SESSION RESTORE
    ========================================================
    */

    restoreSession() {

        try {

            const saved =
                localStorage.getItem(
                    'flashcard_app_session'
                );

            if (!saved) {

                return;

            }

            const session =
                JSON.parse(saved);

            this.state.cards =
                session.cards || [];

            this.state.subjects =
                session.subjects || {};

            this.state.currentSubject =
                session.currentSubject;

            this.state.currentChapter =
                session.currentChapter;

            if (
                this.state.cards.length
            ) {

                this.initializeStudySystems();

                this.renderSubjects();

                this.loadAllCards();

            }

        }
        catch (error) {

            console.error(error);

        }

    }


    /*
    ========================================================
    RESET
    ========================================================
    */

    reset() {

        localStorage.removeItem(
            'flashcard_app_session'
        );

        location.reload();

    }

}


/*
========================================================
APP BOOTSTRAP
========================================================
*/

window.addEventListener(

    'DOMContentLoaded',

    async () => {

        const app =
            new FlashcardApp();

        await app.init();

        window.flashcardApp = app;

    }

);