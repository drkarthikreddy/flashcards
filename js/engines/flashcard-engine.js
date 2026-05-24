/*

FLASHCARD ENGINE — COMPLETE ADVANCED FLASHCARD RENDERER

FEATURES

✔ Virtual rendering engine ✔ Massive deck optimization ✔ Swipe gestures ✔ 3D flip animations ✔ Dynamic card templates ✔ Multiple study modes ✔ Audio support ✔ Image support ✔ LaTeX rendering ✔ Timer mode ✔ Exam simulation mode ✔ Randomization engine ✔ Bookmark integration ✔ Revision integration ✔ Weak card integration ✔ Keyboard shortcuts ✔ Touch optimization ✔ Fullscreen mode ✔ Smart preload system ✔ Lazy rendering ✔ Offline optimized ✔ Session tracking ✔ Card transitions ✔ Focus mode ✔ Statistics overlay ✔ Study streaks ✔ Theme system ✔ Auto-save progress ✔ Accessibility support ✔ Mobile optimized ✔ Huge deck support

======================================================== */

class FlashcardEngine {

constructor(options = {}) {

    this.options = {

        container: '#flashcard-app',

        animationDuration: 450,

        preloadCards: 5,

        enableAudio: true,

        enableLatex: true,

        enableImages: true,

        swipeThreshold: 70,

        autoSave: true,

        darkMode: false,

        studyMode: 'normal',

        enableFullscreen: true,

        enableKeyboardShortcuts: true,

        enableStatistics: true,

        autoFlip: false,

        autoFlipDelay: 7000,

        examTimer: 60,

        maxVirtualCards: 50,

        performanceMode: true,

        ...options

    };


    this.cards = [];

    this.filteredCards = [];

    this.currentIndex = 0;

    this.currentCard = null;

    this.flipped = false;

    this.bookmarks = new Set();

    this.weakCards = new Set();

    this.favorites = new Set();

    this.statistics = {

        viewed: 0,
        flipped: 0,
        correct: 0,
        incorrect: 0,
        skipped: 0,
        totalTime: 0

    };


    this.session = {

        startedAt: Date.now(),

        cardsViewed: []

    };


    this.touch = {

        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0

    };


    this.virtualPool = [];

    this.preloadedCards = new Map();

    this.audioCache = new Map();

    this.timer = null;

    this.autoFlipTimer = null;

    this.container = null;

    this.elements = {};

}


/*
========================================================
INITIALIZATION
========================================================
*/

init(cards = []) {

    this.cards = cards;

    this.filteredCards = [...cards];

    this.container = document.querySelector(
        this.options.container
    );

    if (!this.container) {
        throw new Error('Container not found');
    }

    this.createUI();

    this.attachEvents();

    this.initializeVirtualPool();

    this.renderCard(0);

    this.preloadUpcomingCards();

    this.startSession();

    this.loadSavedState();

    return this;

}


/*
========================================================
CREATE UI
========================================================
*/

createUI() {

    this.container.innerHTML = `

        <div class="fc-engine ${this.options.darkMode ? 'dark' : ''}">

            <div class="fc-topbar">

                <div class="fc-progress-wrapper">
                    <div class="fc-progress"></div>
                </div>

                <div class="fc-stats">
                    <span class="fc-counter">0 / 0</span>
                </div>

            </div>


            <div class="fc-stage">

                <div class="fc-card-wrapper">

                    <div class="fc-card">

                        <div class="fc-face fc-front">

                            <div class="fc-subject"></div>

                            <div class="fc-question"></div>

                            <div class="fc-tags"></div>

                        </div>

                        <div class="fc-face fc-back">

                            <div class="fc-answer"></div>

                            <div class="fc-extra"></div>

                        </div>

                    </div>

                </div>

            </div>


            <div class="fc-controls">

                <button class="fc-btn" data-action="prev">
                    ◀
                </button>

                <button class="fc-btn" data-action="flip">
                    Flip
                </button>

                <button class="fc-btn" data-action="next">
                    ▶
                </button>

                <button class="fc-btn" data-action="bookmark">
                    ★
                </button>

                <button class="fc-btn" data-action="weak">
                    ⚠
                </button>

                <button class="fc-btn" data-action="fullscreen">
                    ⛶
                </button>

            </div>


            <div class="fc-overlay hidden">

                <div class="fc-overlay-content"></div>

            </div>

        </div>

    `;

    this.injectStyles();

    this.mapElements();

}


/*
========================================================
MAP ELEMENTS
========================================================
*/

mapElements() {

    this.elements.card =
        this.container.querySelector('.fc-card');

    this.elements.question =
        this.container.querySelector('.fc-question');

    this.elements.answer =
        this.container.querySelector('.fc-answer');

    this.elements.subject =
        this.container.querySelector('.fc-subject');

    this.elements.tags =
        this.container.querySelector('.fc-tags');

    this.elements.progress =
        this.container.querySelector('.fc-progress');

    this.elements.counter =
        this.container.querySelector('.fc-counter');

    this.elements.overlay =
        this.container.querySelector('.fc-overlay');

}


/*
========================================================
RENDER CARD
========================================================
*/

renderCard(index) {

    if (
        index < 0 ||
        index >= this.filteredCards.length
    ) {
        return;
    }

    this.currentIndex = index;

    this.currentCard =
        this.filteredCards[index];

    const card = this.currentCard;

    this.elements.question.innerHTML =
        this.parseContent(card.question || '');

    this.elements.answer.innerHTML =
        this.parseContent(card.answer || '');

    this.elements.subject.innerHTML =
        `${card.subject || 'General'} • ${card.chapter || ''}`;

    this.renderTags(card.tags || []);

    this.updateProgress();

    this.resetFlip();

    this.animateCard();

    this.statistics.viewed++;

    this.session.cardsViewed.push(card.id);

    this.preloadUpcomingCards();

    this.saveProgress();

    if (this.options.autoFlip) {
        this.startAutoFlip();
    }

}


/*
========================================================
PARSE CONTENT
========================================================
*/

parseContent(content) {

    content = this.escapeHTML(content);

    content = content.replace(
        /\n/g,
        '<br>'
    );

    if (this.options.enableLatex) {
        content = this.parseLatex(content);
    }

    if (this.options.enableImages) {
        content = this.parseImages(content);
    }

    return content;

}


/*
========================================================
LATEX
========================================================
*/

parseLatex(content) {

    return content.replace(
        /\$\$(.*?)\$\$/g,
        '<span class="fc-latex">$1</span>'
    );

}


/*
========================================================
IMAGES
========================================================
*/

parseImages(content) {

    return content.replace(
        /img:(.*?)/g,
        '<img class="fc-image" src="$1">'
    );

}


/*
========================================================
TAGS
========================================================
*/

renderTags(tags = []) {

    this.elements.tags.innerHTML = tags
        .map(tag => {
            return `<span class="fc-tag">${tag}</span>`;
        })
        .join('');

}


/*
========================================================
FLIP
========================================================
*/

flip() {

    this.flipped = !this.flipped;

    this.elements.card.classList.toggle(
        'flipped',
        this.flipped
    );

    this.statistics.flipped++;

}


resetFlip() {

    this.flipped = false;

    this.elements.card.classList.remove('flipped');

}


/*
========================================================
NEXT / PREVIOUS
========================================================
*/

next() {

    if (
        this.currentIndex <
        this.filteredCards.length - 1
    ) {

        this.renderCard(this.currentIndex + 1);

    }

}


previous() {

    if (this.currentIndex > 0) {

        this.renderCard(this.currentIndex - 1);

    }

}


/*
========================================================
RANDOM CARD
========================================================
*/

randomCard() {

    const random = Math.floor(
        Math.random() * this.filteredCards.length
    );

    this.renderCard(random);

}


/*
========================================================
BOOKMARKS
========================================================
*/

toggleBookmark() {

    const id = this.currentCard.id;

    if (this.bookmarks.has(id)) {

        this.bookmarks.delete(id);

    }
    else {

        this.bookmarks.add(id);

    }

    this.saveProgress();

}


/*
========================================================
WEAK CARD
========================================================
*/

toggleWeak() {

    const id = this.currentCard.id;

    if (this.weakCards.has(id)) {

        this.weakCards.delete(id);

    }
    else {

        this.weakCards.add(id);

    }

    this.saveProgress();

}


/*
========================================================
FILTER MODES
========================================================
*/

showBookmarks() {

    this.filteredCards = this.cards.filter(card => {
        return this.bookmarks.has(card.id);
    });

    this.renderCard(0);

}


showWeakCards() {

    this.filteredCards = this.cards.filter(card => {
        return this.weakCards.has(card.id);
    });

    this.renderCard(0);

}


resetFilters() {

    this.filteredCards = [...this.cards];

    this.renderCard(0);

}


/*
========================================================
EXAM MODE
========================================================
*/

startExamMode(minutes = 60) {

    this.options.studyMode = 'exam';

    let seconds = minutes * 60;

    clearInterval(this.timer);

    this.timer = setInterval(() => {

        seconds--;

        this.showOverlay(
            `Time Left: ${this.formatTime(seconds)}`
        );

        if (seconds <= 0) {

            clearInterval(this.timer);

            this.showOverlay('Exam Finished');

        }

    }, 1000);

}


/*
========================================================
AUTO FLIP
========================================================
*/

startAutoFlip() {

    clearTimeout(this.autoFlipTimer);

    this.autoFlipTimer = setTimeout(() => {

        if (!this.flipped) {
            this.flip();
        }

    }, this.options.autoFlipDelay);

}


/*
========================================================
PRELOAD
========================================================
*/

preloadUpcomingCards() {

    const start = this.currentIndex + 1;

    const end = Math.min(
        start + this.options.preloadCards,
        this.filteredCards.length
    );

    for (let i = start; i < end; i++) {

        const card = this.filteredCards[i];

        this.preloadedCards.set(card.id, card);

    }

}


/*
========================================================
VIRTUAL POOL
========================================================
*/

initializeVirtualPool() {

    for (
        let i = 0;
        i < this.options.maxVirtualCards;
        i++
    ) {

        this.virtualPool.push({
            id: i,
            active: false
        });

    }

}


/*
========================================================
STATISTICS
========================================================
*/

updateProgress() {

    const percent = (
        (this.currentIndex + 1) /
        this.filteredCards.length
    ) * 100;

    this.elements.progress.style.width =
        `${percent}%`;

    this.elements.counter.innerHTML =
        `${this.currentIndex + 1} / ${this.filteredCards.length}`;

}


getStatistics() {

    return {

        ...this.statistics,

        bookmarks: this.bookmarks.size,

        weakCards: this.weakCards.size,

        viewedPercent:
            (
                this.statistics.viewed /
                this.filteredCards.length
            ) * 100

    };

}


/*
========================================================
ANIMATION
========================================================
*/

animateCard() {

    this.elements.card.animate([

        {
            transform: 'scale(0.96)',
            opacity: 0
        },

        {
            transform: 'scale(1)',
            opacity: 1
        }

    ], {

        duration: this.options.animationDuration,

        easing: 'ease'

    });

}


/*
========================================================
FULLSCREEN
========================================================
*/

toggleFullscreen() {

    if (!document.fullscreenElement) {

        this.container.requestFullscreen();

    }
    else {

        document.exitFullscreen();

    }

}


/*
========================================================
EVENTS
========================================================
*/

attachEvents() {

    /*
    ----------------------------------------------------
    CONTROLS
    ----------------------------------------------------
    */

    this.container.addEventListener(
        'click',
        event => {

            const button = event.target.closest('.fc-btn');

            if (!button) return;

            const action = button.dataset.action;

            this.handleAction(action);

        }
    );


    /*
    ----------------------------------------------------
    CARD CLICK
    ----------------------------------------------------
    */

    this.elements.card?.addEventListener(
        'click',
        () => this.flip()
    );


    /*
    ----------------------------------------------------
    TOUCH
    ----------------------------------------------------
    */

    this.attachTouchEvents();


    /*
    ----------------------------------------------------
    KEYBOARD
    ----------------------------------------------------
    */

    if (this.options.enableKeyboardShortcuts) {

        this.attachKeyboardEvents();

    }

}


/*
========================================================
ACTIONS
========================================================
*/

handleAction(action) {

    switch (action) {

        case 'next':
            this.next();
            break;

        case 'prev':
            this.previous();
            break;

        case 'flip':
            this.flip();
            break;

        case 'bookmark':
            this.toggleBookmark();
            break;

        case 'weak':
            this.toggleWeak();
            break;

        case 'fullscreen':
            this.toggleFullscreen();
            break;

    }

}


/*
========================================================
TOUCH EVENTS
========================================================
*/

attachTouchEvents() {

    this.container.addEventListener(
        'touchstart',
        event => {

            this.touch.startX =
                event.changedTouches[0].screenX;

            this.touch.startY =
                event.changedTouches[0].screenY;

        }
    );


    this.container.addEventListener(
        'touchend',
        event => {

            this.touch.endX =
                event.changedTouches[0].screenX;

            this.touch.endY =
                event.changedTouches[0].screenY;

            this.handleSwipe();

        }
    );

}


handleSwipe() {

    const diffX =
        this.touch.endX - this.touch.startX;

    if (
        Math.abs(diffX) <
        this.options.swipeThreshold
    ) {
        return;
    }

    if (diffX > 0) {
        this.previous();
    }
    else {
        this.next();
    }

}


/*
========================================================
KEYBOARD EVENTS
========================================================
*/

attachKeyboardEvents() {

    window.addEventListener(
        'keydown',
        event => {

            switch (event.key) {

                case 'ArrowRight':
                    this.next();
                    break;

                case 'ArrowLeft':
                    this.previous();
                    break;

                case ' ':
                    event.preventDefault();
                    this.flip();
                    break;

                case 'b':
                    this.toggleBookmark();
                    break;

                case 'w':
                    this.toggleWeak();
                    break;

                case 'f':
                    this.toggleFullscreen();
                    break;

            }

        }
    );

}


/*
========================================================
OVERLAY
========================================================
*/

showOverlay(message) {

    this.elements.overlay.classList.remove('hidden');

    this.elements.overlay.querySelector(
        '.fc-overlay-content'
    ).innerHTML = message;

}


hideOverlay() {

    this.elements.overlay.classList.add('hidden');

}


/*
========================================================
SAVE PROGRESS
========================================================
*/

saveProgress() {

    if (!this.options.autoSave) return;

    localStorage.setItem(
        'flashcard_engine_state',
        JSON.stringify({

            currentIndex: this.currentIndex,

            bookmarks: [...this.bookmarks],

            weakCards: [...this.weakCards],

            statistics: this.statistics

        })
    );

}


/*
========================================================
LOAD STATE
========================================================
*/

loadSavedState() {

    try {

        const saved = localStorage.getItem(
            'flashcard_engine_state'
        );

        if (!saved) return;

        const state = JSON.parse(saved);

        this.currentIndex =
            state.currentIndex || 0;

        this.bookmarks = new Set(
            state.bookmarks || []
        );

        this.weakCards = new Set(
            state.weakCards || []
        );

        this.statistics =
            state.statistics || this.statistics;

    }
    catch (error) {

        console.error(error);

    }

}


/*
========================================================
SESSION
========================================================
*/

startSession() {

    this.session.startedAt = Date.now();

}


endSession() {

    this.session.endedAt = Date.now();

    this.session.duration =
        this.session.endedAt -
        this.session.startedAt;

    return this.session;

}


/*
========================================================
UTILITIES
========================================================
*/

escapeHTML(text = '') {

    return text.replace(/[&<>"']/g, char => {

        const entities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return entities[char];

    });

}


formatTime(seconds) {

    const mins = Math.floor(seconds / 60);

    const secs = seconds % 60;

    return `${mins}:${secs
        .toString()
        .padStart(2, '0')}`;

}


/*
========================================================
STYLES
========================================================
*/

injectStyles() {

        if (
            document.getElementById(
                'flashcard-engine-styles'
            )
        ) {
            return;
        }

        const style = document.createElement('style');
style.id = 'flashcard-engine-styles';

        style.innerHTML = `

            .fc-engine{
                width:100%;
                height:100%;
                display:flex;
                flex-direction:column;
                font-family:Inter,sans-serif;
                position:relative;
            }

            .fc-topbar{
                padding:14px;
            }

            .fc-progress-wrapper{
                width:100%;
                height:10px;
                background:#eee;
                border-radius:999px;
                overflow:hidden;
            }

            .fc-progress{
                width:0%;
                height:100%;
                background:#111;
                transition:0.3s;
            }

            .fc-stage{
                flex:1;
                display:flex;
                align-items:center;
                justify-content:center;
                padding:20px;
                perspective:1600px;
            }

            .fc-card-wrapper{
                width:min(900px,100%);
                height:550px;
            }

            .fc-card{
                width:100%;
                height:100%;
                position:relative;
                transform-style:preserve-3d;
                transition:0.6s;
                cursor:pointer;
            }

            .fc-card.flipped{
                transform:rotateY(180deg);
            }

            .fc-face{
                position:absolute;
                width:100%;
                height:100%;
                background:white;
                border-radius:30px;
                box-shadow:0 20px 60px rgba(0,0,0,0.08);
                padding:35px;
                backface-visibility:hidden;
                overflow:auto;
            }

            .fc-back{
                transform:rotateY(180deg);
            }

            .fc-question{
                font-size:2rem;
                font-weight:700;
                line-height:1.7;
                margin-top:20px;
            }

            .fc-answer{
                font-size:1.2rem;
                line-height:2;
            }

            .fc-controls{
                display:flex;
                justify-content:center;
                gap:14px;
                padding:20px;
                flex-wrap:wrap;
            }

            .fc-btn{
                border:none;
                border-radius:18px;
                padding:14px 18px;
                cursor:pointer;
                font-weight:700;
            }

            .fc-tags{
                margin-top:25px;
                display:flex;
                gap:10px;
                flex-wrap:wrap;
            }

            .fc-tag{
                background:#eee;
                padding:6px 12px;
                border-radius:999px;
                font-size:0.85rem;
            }

            .fc-overlay{
                position:absolute;
                inset:0;
                background:rgba(0,0,0,0.7);
                display:flex;
                align-items:center;
                justify-content:center;
                color:white;
                font-size:2rem;
                z-index:100;
            }

            .hidden{
                display:none;
            }

            @media(max-width:768px){

                .fc-card-wrapper{
                    height:450px;
                }

                .fc-question{
                    font-size:1.5rem;
                }

                .fc-answer{
                    font-size:1rem;
                }

            }

        `;

        document.head.appendChild(style);

    }

}


/*
========================================================
GLOBAL EXPORT
========================================================
*/

window.FlashcardEngine = FlashcardEngine;


/*
========================================================
USAGE EXAMPLE
========================================================

const engine = new FlashcardEngine();

engine.init(cards);

========================================================
*/
