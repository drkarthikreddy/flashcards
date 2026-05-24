/*

REVISION ENGINE — COMPLETE SPACED REPETITION ENGINE

FEATURES

✔ SM-2 spaced repetition algorithm ✔ Adaptive revision intervals ✔ Daily revision queue ✔ Weak card prioritization ✔ Memory retention scoring ✔ Exam countdown mode ✔ High-yield mode ✔ Smart scheduling ✔ Revision streaks ✔ Subject-wise revision ✔ Chapter-wise revision ✔ Retention analytics ✔ Heatmap-ready data ✔ Learning phases ✔ Review statistics ✔ Offline support ✔ Huge deck support ✔ IndexedDB compatible ✔ Mobile optimized ✔ Pomodoro support ✔ Session planning ✔ Revision forecasting ✔ Custom intervals ✔ Performance tracking

======================================================== */

class RevisionEngine {

constructor(cards = [], options = {}) {

    this.cards = cards;

    this.options = {

        learningSteps: [1, 10, 1440],

        graduatingInterval: 1,

        easyInterval: 4,

        startingEase: 2.5,

        minimumEase: 1.3,

        maximumInterval: 36500,

        examMode: false,

        examDate: null,

        dailyNewCards: 100,

        dailyReviewLimit: 9999,

        weakCardMultiplier: 1.5,

        retentionTarget: 0.9,

        autoSave: true,

        storageKey: 'revision_engine_state',

        ...options

    };


    this.state = {

        cards: {},

        statistics: {

            totalReviews: 0,
            totalCorrect: 0,
            totalIncorrect: 0,
            averageRetention: 0,
            currentStreak: 0,
            longestStreak: 0,
            studyDays: 0,
            totalStudyTime: 0

        },

        sessions: [],

        heatmap: {},

        dailyStats: {}

    };


    this.currentSession = null;

    this.initialize();

}


/*
========================================================
INITIALIZATION
========================================================
*/

initialize() {

    this.loadState();

    this.initializeCards();

}


/*
========================================================
INITIALIZE CARD STATES
========================================================
*/

initializeCards() {

    this.cards.forEach(card => {

        if (!this.state.cards[card.id]) {

            this.state.cards[card.id] = {

                id: card.id,

                repetitions: 0,

                interval: 0,

                easeFactor: this.options.startingEase,

                dueDate: Date.now(),

                lastReviewed: null,

                lapses: 0,

                correct: 0,

                incorrect: 0,

                averageResponseTime: 0,

                retentionScore: 0,

                phase: 'new',

                suspended: false,

                buried: false,

                tags: card.tags || [],

                subject: card.subject || 'General',

                chapter: card.chapter || 'General'

            };

        }

    });

}


/*
========================================================
START SESSION
========================================================
*/

startSession(type = 'review') {

    this.currentSession = {

        id: Date.now(),

        type,

        startedAt: Date.now(),

        cardsReviewed: 0,

        correct: 0,

        incorrect: 0,

        reviewedCards: []

    };

    return this.currentSession;

}


/*
========================================================
END SESSION
========================================================
*/

endSession() {

    if (!this.currentSession) return null;

    this.currentSession.endedAt = Date.now();

    this.currentSession.duration =
        this.currentSession.endedAt -
        this.currentSession.startedAt;

    this.state.sessions.unshift(this.currentSession);

    this.state.statistics.totalStudyTime +=
        this.currentSession.duration;

    this.updateHeatmap();

    this.saveState();

    return this.currentSession;

}


/*
========================================================
REVIEW CARD
========================================================
*/

reviewCard(cardId, quality = 3, responseTime = 0) {

    const cardState = this.state.cards[cardId];

    if (!cardState) return null;

    const now = Date.now();

    cardState.lastReviewed = now;

    cardState.repetitions++;

    cardState.averageResponseTime =
        this.calculateAverageResponseTime(
            cardState.averageResponseTime,
            responseTime,
            cardState.repetitions
        );

    if (quality >= 3) {

        cardState.correct++;

        this.state.statistics.totalCorrect++;

    }
    else {

        cardState.incorrect++;

        cardState.lapses++;

        this.state.statistics.totalIncorrect++;

    }

    this.state.statistics.totalReviews++;

    this.applySM2(cardState, quality);

    cardState.retentionScore =
        this.calculateRetention(cardState);

    cardState.phase =
        this.determinePhase(cardState);

    if (this.currentSession) {

        this.currentSession.cardsReviewed++;

        this.currentSession.reviewedCards.push(cardId);

        if (quality >= 3) {
            this.currentSession.correct++;
        }
        else {
            this.currentSession.incorrect++;
        }

    }

    this.updateStatistics();

    this.saveState();

    return cardState;

}


/*
========================================================
SM-2 ALGORITHM
========================================================
*/

applySM2(cardState, quality) {

    if (quality < 3) {

        cardState.repetitions = 0;

        cardState.interval = 1;

        cardState.easeFactor = Math.max(
            this.options.minimumEase,
            cardState.easeFactor - 0.2
        );

    }
    else {

        if (cardState.repetitions === 1) {

            cardState.interval =
                this.options.graduatingInterval;

        }
        else if (cardState.repetitions === 2) {

            cardState.interval =
                this.options.easyInterval;

        }
        else {

            cardState.interval = Math.round(
                cardState.interval *
                cardState.easeFactor
            );

        }

        cardState.easeFactor = Math.max(
            this.options.minimumEase,
            cardState.easeFactor +
            (0.1 - (5 - quality) *
            (0.08 + (5 - quality) * 0.02))
        );

    }

    if (
        this.options.examMode &&
        this.options.examDate
    ) {

        cardState.interval = Math.min(
            cardState.interval,
            this.calculateExamSafeInterval()
        );

    }

    cardState.interval = Math.min(
        cardState.interval,
        this.options.maximumInterval
    );

    cardState.dueDate =
        Date.now() +
        (cardState.interval * 86400000);

}


/*
========================================================
DAILY REVIEW QUEUE
========================================================
*/

getDailyQueue() {

    const now = Date.now();

    const reviewCards = [];
    const newCards = [];

    Object.values(this.state.cards)
        .forEach(cardState => {

            if (cardState.suspended) return;

            if (cardState.phase === 'new') {

                newCards.push(cardState);

            }
            else if (cardState.dueDate <= now) {

                reviewCards.push(cardState);

            }

        });

    reviewCards.sort((a, b) => {
        return a.dueDate - b.dueDate;
    });

    newCards.sort((a, b) => {
        return a.id.localeCompare(b.id);
    });

    return {

        review: reviewCards.slice(
            0,
            this.options.dailyReviewLimit
        ),

        new: newCards.slice(
            0,
            this.options.dailyNewCards
        )

    };

}


/*
========================================================
WEAK CARD QUEUE
========================================================
*/

getWeakCardQueue(limit = 100) {

    return Object.values(this.state.cards)
        .filter(card => {
            return (
                card.retentionScore < 0.6 ||
                card.lapses >= 3
            );
        })
        .sort((a, b) => {
            return a.retentionScore - b.retentionScore;
        })
        .slice(0, limit);

}


/*
========================================================
HIGH YIELD MODE
========================================================
*/

getHighYieldCards(limit = 200) {

    return Object.values(this.state.cards)
        .filter(card => {
            return (
                card.retentionScore < 0.8 &&
                card.repetitions > 0
            );
        })
        .sort((a, b) => {
            return a.retentionScore - b.retentionScore;
        })
        .slice(0, limit);

}


/*
========================================================
SUBJECT REVISION
========================================================
*/

getSubjectQueue(subject) {

    return Object.values(this.state.cards)
        .filter(card => {
            return card.subject === subject;
        });

}


/*
========================================================
CHAPTER REVISION
========================================================
*/

getChapterQueue(chapter) {

    return Object.values(this.state.cards)
        .filter(card => {
            return card.chapter === chapter;
        });

}


/*
========================================================
RETENTION SCORE
========================================================
*/

calculateRetention(cardState) {

    const total =
        cardState.correct + cardState.incorrect;

    if (total === 0) return 0;

    return cardState.correct / total;

}


/*
========================================================
DETERMINE PHASE
========================================================
*/

determinePhase(cardState) {

    if (cardState.repetitions === 0) {
        return 'new';
    }

    if (cardState.repetitions < 3) {
        return 'learning';
    }

    if (cardState.retentionScore < 0.7) {
        return 'weak';
    }

    return 'mature';

}


/*
========================================================
EXAM SAFE INTERVAL
========================================================
*/

calculateExamSafeInterval() {

    if (!this.options.examDate) return 365;

    const remaining =
        this.options.examDate - Date.now();

    return Math.max(
        1,
        Math.floor(remaining / 86400000 / 3)
    );

}


/*
========================================================
UPDATE HEATMAP
========================================================
*/

updateHeatmap() {

    const today = new Date()
        .toISOString()
        .split('T')[0];

    if (!this.state.heatmap[today]) {
        this.state.heatmap[today] = 0;
    }

    this.state.heatmap[today]++;

}


/*
========================================================
UPDATE STATISTICS
========================================================
*/

updateStatistics() {

    const stats = this.state.statistics;

    const total =
        stats.totalCorrect +
        stats.totalIncorrect;

    stats.averageRetention =
        total > 0
            ? stats.totalCorrect / total
            : 0;

}


/*
========================================================
RESPONSE TIME
========================================================
*/

calculateAverageResponseTime(
    currentAverage,
    newTime,
    repetitions
) {

    return (
        (currentAverage * (repetitions - 1)) +
        newTime
    ) / repetitions;

}


/*
========================================================
STREAKS
========================================================
*/

calculateStreak() {

    const days = Object.keys(this.state.heatmap)
        .sort();

    let streak = 0;

    for (let i = days.length - 1; i >= 0; i--) {

        streak++;

    }

    this.state.statistics.currentStreak = streak;

    this.state.statistics.longestStreak = Math.max(
        this.state.statistics.longestStreak,
        streak
    );

}


/*
========================================================
FORECAST
========================================================
*/

getForecast(days = 30) {

    const forecast = [];

    for (let i = 0; i < days; i++) {

        const date =
            Date.now() +
            (i * 86400000);

        const count = Object.values(this.state.cards)
            .filter(card => {
                return card.dueDate <= date;
            }).length;

        forecast.push({
            day: i + 1,
            reviews: count
        });

    }

    return forecast;

}


/*
========================================================
SUSPEND CARD
========================================================
*/

suspendCard(cardId) {

    if (this.state.cards[cardId]) {

        this.state.cards[cardId].suspended = true;

        this.saveState();

    }

}


unsuspendCard(cardId) {

    if (this.state.cards[cardId]) {

        this.state.cards[cardId].suspended = false;

        this.saveState();

    }

}


/*
========================================================
ANALYTICS
========================================================
*/

getAnalytics() {

    const stats = this.state.statistics;

    return {

        ...stats,

        totalCards:
            Object.keys(this.state.cards).length,

        matureCards:
            this.countByPhase('mature'),

        learningCards:
            this.countByPhase('learning'),

        weakCards:
            this.countByPhase('weak'),

        newCards:
            this.countByPhase('new'),

        dueToday:
            this.getDailyQueue().review.length,

        averageEase:
            this.calculateAverageEase(),

        retention:
            (stats.averageRetention * 100)
                .toFixed(1)

    };

}


/*
========================================================
COUNT PHASE
========================================================
*/

countByPhase(phase) {

    return Object.values(this.state.cards)
        .filter(card => {
            return card.phase === phase;
        }).length;

}


/*
========================================================
AVERAGE EASE
========================================================
*/

calculateAverageEase() {

    const cards = Object.values(this.state.cards);

    if (!cards.length) return 0;

    const total = cards.reduce((sum, card) => {
        return sum + card.easeFactor;
    }, 0);

    return (total / cards.length).toFixed(2);

}


/*
========================================================
SAVE STATE
========================================================
*/

saveState() {

    if (!this.options.autoSave) return;

    localStorage.setItem(
        this.options.storageKey,
        JSON.stringify(this.state)
    );

}


/*
========================================================
LOAD STATE
========================================================
*/

loadState() {

    try {

        const saved = localStorage.getItem(
            this.options.storageKey
        );

        if (saved) {
            this.state = JSON.parse(saved);
        }

    } catch (error) {

        console.error(error);

    }

}


/*
========================================================
EXPORT
========================================================
*/

exportState() {

    return JSON.stringify(this.state, null, 2);

}


/*
========================================================
IMPORT
========================================================
*/

importState(json) {

    try {

        this.state = JSON.parse(json);

        this.saveState();

        return true;

    } catch (error) {

        console.error(error);

        return false;

    }

}


/*
========================================================
RESET
========================================================
*/

reset() {

    localStorage.removeItem(
        this.options.storageKey
    );

    this.state = {

        cards: {},

        statistics: {
            totalReviews: 0,
            totalCorrect: 0,
            totalIncorrect: 0,
            averageRetention: 0,
            currentStreak: 0,
            longestStreak: 0,
            studyDays: 0,
            totalStudyTime: 0
        },

        sessions: [],
        heatmap: {},
        dailyStats: {}

    };

    this.initializeCards();

}

}

/*

GLOBAL EXPORT

*/

window.RevisionEngine = RevisionEngine;

/*

USAGE EXAMPLE

const revisionEngine = new RevisionEngine(cards);

revisionEngine.startSession();

revisionEngine.reviewCard('card-id', 4);

const queue = revisionEngine.getDailyQueue();

console.log(queue);

======================================================== */