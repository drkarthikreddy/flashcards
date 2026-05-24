/*
========================================================
APKG ENGINE — COMPLETE ANKI APKG IMPORT ENGINE
========================================================

FEATURES
========================================================

✔ Parse .apkg files
✔ Extract SQLite database
✔ Extract media files
✔ Parse Anki notes/cards
✔ Deck organization
✔ Subject-wise grouping
✔ Chapter-wise grouping
✔ Media mapping
✔ HTML sanitization
✔ Image/audio support
✔ Large deck support
✔ Offline processing
✔ Browser-only architecture
✔ SQL.js support
✔ JSZip support
✔ Duplicate removal
✔ Tag extraction
✔ Search-ready structure
✔ Flashcard normalization
✔ Error handling
✔ Import statistics
✔ Progress callbacks
✔ Async architecture
✔ Memory optimized
✔ Multi-deck compatible

REQUIRED LIBRARIES
========================================================

1. jszip.min.js
2. sql-wasm.js
3. dompurify.min.js

========================================================
*/

class APKGEngine {

    constructor(options = {}) {

        this.options = {

            enableSanitization: true,

            enableMediaExtraction: true,

            enableAudio: true,

            enableImages: true,

            removeDuplicates: true,

            debug: false,

            progressCallback: null,

            supportedMedia: [
                'jpg',
                'jpeg',
                'png',
                'gif',
                'webp',
                'mp3',
                'wav',
                'ogg'
            ],

            ...options

        };

        this.zip = null;

        this.db = null;

        this.mediaMap = {};

        this.cards = [];

        this.decks = [];

        this.statistics = {

            totalCards: 0,

            totalNotes: 0,

            totalDecks: 0,

            totalMedia: 0,

            duplicatesRemoved: 0,

            importedAt: Date.now()

        };

    }


    /*
    ========================================================
    MAIN IMPORT
    ========================================================
    */

    async import(file) {

        try {

            this.reportProgress(
                0,
                'Initializing import'
            );

            await this.loadZip(file);

            this.reportProgress(
                10,
                'ZIP loaded'
            );

            await this.loadDatabase();

            this.reportProgress(
                25,
                'Database loaded'
            );

            await this.loadMediaMap();

            this.reportProgress(
                35,
                'Media map loaded'
            );

            await this.extractDecks();

            this.reportProgress(
                50,
                'Decks extracted'
            );

            await this.extractCards();

            this.reportProgress(
                80,
                'Cards extracted'
            );

            if (this.options.removeDuplicates) {

                this.removeDuplicates();

            }

            this.organizeCards();

            this.reportProgress(
                95,
                'Cards organized'
            );

            const result = this.buildExport();

            this.reportProgress(
                100,
                'Import completed'
            );

            return result;

        }
        catch (error) {

            console.error(error);

            throw error;

        }

    }


    /*
    ========================================================
    LOAD ZIP
    ========================================================
    */

    async loadZip(file) {

        this.zip = await JSZip.loadAsync(file);

    }


    /*
    ========================================================
    LOAD DATABASE
    ========================================================
    */

    async loadDatabase() {

        const dbFile =
            this.zip.file('collection.anki2');

        if (!dbFile) {

            throw new Error(
                'collection.anki2 not found'
            );

        }

        const dbData =
            await dbFile.async('arraybuffer');

        const SQL = await initSqlJs({

            locateFile: file =>
                `./js/libs/${file}`

        });

        this.db = new SQL.Database(
            new Uint8Array(dbData)
        );

    }


    /*
    ========================================================
    LOAD MEDIA MAP
    ========================================================
    */

    async loadMediaMap() {

        const mediaFile =
            this.zip.file('media');

        if (!mediaFile) {

            return;

        }

        const mediaText =
            await mediaFile.async('text');

        this.mediaMap =
            JSON.parse(mediaText);

        this.statistics.totalMedia =
            Object.keys(this.mediaMap).length;

    }


    /*
    ========================================================
    EXTRACT DECKS
    ========================================================
    */

    async extractDecks() {

        const result =
            this.db.exec(`
                SELECT decks
                FROM col
            `);

        if (!result.length) {

            return;

        }

        const decksJSON =
            result[0].values[0][0];

        const decks =
            JSON.parse(decksJSON);

        this.decks = Object.values(decks);

        this.statistics.totalDecks =
            this.decks.length;

    }


    /*
    ========================================================
    EXTRACT CARDS
    ========================================================
    */

    async extractCards() {

        const query = `
            SELECT
                notes.id,
                notes.flds,
                notes.tags,
                cards.did
            FROM notes
            JOIN cards
            ON notes.id = cards.nid
        `;

        const result = this.db.exec(query);

        if (!result.length) {

            return;

        }

        const rows = result[0].values;

        this.statistics.totalNotes =
            rows.length;

        for (let i = 0; i < rows.length; i++) {

            const row = rows[i];

            const card =
                await this.parseCard(row);

            if (card) {

                this.cards.push(card);

            }

            if (i % 100 === 0) {

                const progress =
                    50 + (
                        (i / rows.length) * 30
                    );

                this.reportProgress(
                    progress,
                    `Processing card ${i}`
                );

            }

        }

        this.statistics.totalCards =
            this.cards.length;

    }


    /*
    ========================================================
    PARSE CARD
    ========================================================
    */

    async parseCard(row) {

        try {

            const [
                id,
                fields,
                tags,
                deckId
            ] = row;

            const parsedFields =
                fields.split('\u001f');

            const question =
                parsedFields[0] || '';

            const answer =
                parsedFields[1] || '';

            const deck =
                this.getDeck(deckId);

            const mediaQuestion =
                await this.processMedia(question);

            const mediaAnswer =
                await this.processMedia(answer);

            return {

                id: String(id),

                question:
                    this.sanitize(mediaQuestion),

                answer:
                    this.sanitize(mediaAnswer),

                rawQuestion: question,

                rawAnswer: answer,

                tags:
                    this.extractTags(tags),

                subject:
                    this.extractSubject(deck),

                chapter:
                    this.extractChapter(deck),

                deckId,

                deckName:
                    deck ? deck.name : 'General',

                createdAt: Date.now()

            };

        }
        catch (error) {

            console.error(error);

            return null;

        }

    }


    /*
    ========================================================
    GET DECK
    ========================================================
    */

    getDeck(deckId) {

        return this.decks.find(deck => {

            return String(deck.id) ===
                String(deckId);

        });

    }


    /*
    ========================================================
    SUBJECT EXTRACTION
    ========================================================
    */

    extractSubject(deck) {

        if (!deck || !deck.name) {

            return 'General';

        }

        const split =
            deck.name.split('::');

        return split[0] || 'General';

    }


    /*
    ========================================================
    CHAPTER EXTRACTION
    ========================================================
    */

    extractChapter(deck) {

        if (!deck || !deck.name) {

            return 'General';

        }

        const split =
            deck.name.split('::');

        return split[1] || split[0];

    }


    /*
    ========================================================
    TAGS
    ========================================================
    */

    extractTags(tags = '') {

        return tags
            .trim()
            .split(' ')
            .filter(Boolean);

    }


    /*
    ========================================================
    MEDIA PROCESSING
    ========================================================
    */

    async processMedia(html = '') {

        if (!this.options.enableMediaExtraction) {

            return html;

        }

        html =
            await this.processImages(html);

        html =
            await this.processAudio(html);

        return html;

    }


    /*
    ========================================================
    IMAGES
    ========================================================
    */

    async processImages(html) {

        const regex =
            /<img[^>]+src=["']([^"']+)["']/g;

        let match;

        while ((match = regex.exec(html))) {

            const fileName = match[1];

            const mediaFile =
                this.getMediaFile(fileName);

            if (!mediaFile) continue;

            const blob =
                await mediaFile.async('blob');

            const url =
                URL.createObjectURL(blob);

            html =
                html.replace(fileName, url);

        }

        return html;

    }


    /*
    ========================================================
    AUDIO
    ========================================================
    */

    async processAudio(html) {

        const regex =
            /\[sound:(.*?)\]/g;

        let match;

        while ((match = regex.exec(html))) {

            const fileName = match[1];

            const mediaFile =
                this.getMediaFile(fileName);

            if (!mediaFile) continue;

            const blob =
                await mediaFile.async('blob');

            const url =
                URL.createObjectURL(blob);

            const audioHTML = `
                <audio controls>
                    <source src="${url}">
                </audio>
            `;

            html =
                html.replace(
                    `[sound:${fileName}]`,
                    audioHTML
                );

        }

        return html;

    }


    /*
    ========================================================
    MEDIA FILE
    ========================================================
    */

    getMediaFile(fileName) {

        const mediaKey =
            Object.keys(this.mediaMap)
                .find(key => {

                    return this.mediaMap[key] ===
                        fileName;

                });

        if (!mediaKey) {

            return null;

        }

        return this.zip.file(mediaKey);

    }


    /*
    ========================================================
    SANITIZE
    ========================================================
    */

    sanitize(html = '') {

        if (!this.options.enableSanitization) {

            return html;

        }

        return DOMPurify.sanitize(html);

    }


    /*
    ========================================================
    REMOVE DUPLICATES
    ========================================================
    */

    removeDuplicates() {

        const seen = new Set();

        this.cards = this.cards.filter(card => {

            const key =
                `${card.question}_${card.answer}`;

            if (seen.has(key)) {

                this.statistics
                    .duplicatesRemoved++;

                return false;

            }

            seen.add(key);

            return true;

        });

    }


    /*
    ========================================================
    ORGANIZATION
    ========================================================
    */

    organizeCards() {

        const subjects = {};

        this.cards.forEach(card => {

            if (!subjects[card.subject]) {

                subjects[card.subject] = {};

            }

            if (
                !subjects[card.subject][card.chapter]
            ) {

                subjects[card.subject][
                    card.chapter
                ] = [];

            }

            subjects[card.subject][
                card.chapter
            ].push(card);

        });

        this.subjects = subjects;

    }


    /*
    ========================================================
    BUILD EXPORT
    ========================================================
    */

    buildExport() {

        return {

            metadata: {

                importedAt:
                    this.statistics.importedAt,

                totalCards:
                    this.statistics.totalCards,

                totalDecks:
                    this.statistics.totalDecks,

                totalMedia:
                    this.statistics.totalMedia,

                duplicatesRemoved:
                    this.statistics
                        .duplicatesRemoved

            },

            subjects: this.subjects,

            cards: this.cards,

            decks: this.decks

        };

    }


    /*
    ========================================================
    SEARCH
    ========================================================
    */

    search(query = '') {

        query =
            query.toLowerCase().trim();

        return this.cards.filter(card => {

            return (

                card.question
                    .toLowerCase()
                    .includes(query) ||

                card.answer
                    .toLowerCase()
                    .includes(query)

            );

        });

    }


    /*
    ========================================================
    SUBJECTS
    ========================================================
    */

    getSubjects() {

        return Object.keys(this.subjects || {});

    }


    /*
    ========================================================
    CHAPTERS
    ========================================================
    */

    getChapters(subject) {

        if (!this.subjects[subject]) {

            return [];

        }

        return Object.keys(
            this.subjects[subject]
        );

    }


    /*
    ========================================================
    STATS
    ========================================================
    */

    getStatistics() {

        return this.statistics;

    }


    /*
    ========================================================
    PROGRESS
    ========================================================
    */

    reportProgress(percent, message) {

        if (
            typeof this.options.progressCallback ===
            'function'
        ) {

            this.options.progressCallback({

                percent,

                message

            });

        }

        this.log(
            `${percent}% — ${message}`
        );

    }


    /*
    ========================================================
    LOG
    ========================================================
    */

    log(message) {

        if (this.options.debug) {

            console.log(
                '[APKGEngine]',
                message
            );

        }

    }


    /*
    ========================================================
    RESET
    ========================================================
    */

    reset() {

        this.zip = null;

        this.db = null;

        this.mediaMap = {};

        this.cards = [];

        this.subjects = {};

        this.decks = [];

    }

}


/*
========================================================
GLOBAL EXPORT
========================================================
*/

window.APKGEngine = APKGEngine;


/*
========================================================
USAGE EXAMPLE
========================================================

const engine = new APKGEngine({

    progressCallback: progress => {

        console.log(progress);

    }

});

const result =
    await engine.import(file);

console.log(result);

========================================================
*/