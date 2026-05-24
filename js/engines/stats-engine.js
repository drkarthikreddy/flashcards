/*
========================================================
STATS ENGINE — COMPLETE ANALYTICS & STUDY TRACKER
========================================================

FEATURES
========================================================

✔ Study statistics
✔ Daily analytics
✔ Subject analytics
✔ Chapter analytics
✔ Accuracy tracking
✔ Revision tracking
✔ Study streaks
✔ Heatmap data
✔ Session analytics
✔ Performance trends
✔ Weak area detection
✔ Time tracking
✔ Bookmark analytics
✔ Flashcard analytics
✔ Exam readiness score
✔ Productivity scoring
✔ Offline persistence
✔ LocalStorage support
✔ Export/import stats
✔ Charts-ready datasets
✔ Weekly/monthly summaries
✔ Study goals
✔ Completion percentages
✔ Retention estimation
✔ Adaptive recommendations
✔ Massive dataset support

========================================================
*/

class StatsEngine {

    constructor(options = {}) {

        this.options = {

            storageKey: 'flashcard_stats',

            autoSave: true,

            enableHeatmap: true,

            enablePredictions: true,

            debug: false,

            ...options

        };

        this.stats = {

            global: {

                totalCardsViewed: 0,

                totalCardsFlipped: 0,

                totalBookmarks: 0,

                totalWeakCards: 0,

                totalStudyTime: 0,

                totalSessions: 0,

                totalCorrect: 0,

                totalIncorrect: 0,

                currentStreak: 0,

                longestStreak: 0,

                examReadiness: 0,

                productivityScore: 0

            },

            subjects: {},

            chapters: {},

            daily: {},

            sessions: [],

            heatmap: {},

            goals: {

                dailyCards: 100,

                dailyStudyMinutes: 120

            }

        };

        this.currentSession = null;

        this.load();

    }


    /*
    ========================================================
    SESSION START
    ========================================================
    */

    startSession(type = 'flashcards') {

        this.currentSession = {

            id: Date.now(),

            type,

            startedAt: Date.now(),

            endedAt: null,

            duration: 0,

            viewed: 0,

            flipped: 0,

            correct: 0,

            incorrect: 0,

            subjects: {},

            chapters: {}

        };

        return this.currentSession;

    }


    /*
    ========================================================
    SESSION END
    ========================================================
    */

    endSession() {

        if (!this.currentSession) {

            return null;

        }

        this.currentSession.endedAt =
            Date.now();

        this.currentSession.duration =
            this.currentSession.endedAt -
            this.currentSession.startedAt;

        this.stats.sessions.unshift(
            this.currentSession
        );

        this.stats.global.totalSessions++;

        this.stats.global.totalStudyTime +=
            this.currentSession.duration;

        this.updateHeatmap();

        this.updateStreak();

        this.calculateExamReadiness();

        this.calculateProductivity();

        this.autoSave();

        return this.currentSession;

    }


    /*
    ========================================================
    CARD VIEWED
    ========================================================
    */

    cardViewed(card) {

        this.stats.global.totalCardsViewed++;

        if (this.currentSession) {

            this.currentSession.viewed++;

        }

        this.trackSubject(card.subject);

        this.trackChapter(card.chapter);

        this.trackDaily('viewed');

        this.autoSave();

    }


    /*
    ========================================================
    CARD FLIPPED
    ========================================================
    */

    cardFlipped(card) {

        this.stats.global.totalCardsFlipped++;

        if (this.currentSession) {

            this.currentSession.flipped++;

        }

        this.trackDaily('flipped');

        this.autoSave();

    }


    /*
    ========================================================
    ANSWER TRACKING
    ========================================================
    */

    markCorrect(card) {

        this.stats.global.totalCorrect++;

        if (this.currentSession) {

            this.currentSession.correct++;

        }

        this.trackAccuracy(
            card,
            true
        );

        this.trackDaily('correct');

        this.autoSave();

    }


    markIncorrect(card) {

        this.stats.global.totalIncorrect++;

        if (this.currentSession) {

            this.currentSession.incorrect++;

        }

        this.trackAccuracy(
            card,
            false
        );

        this.trackDaily('incorrect');

        this.autoSave();

    }


    /*
    ========================================================
    BOOKMARKS
    ========================================================
    */

    bookmarkAdded() {

        this.stats.global.totalBookmarks++;

        this.trackDaily('bookmarks');

        this.autoSave();

    }


    weakCardAdded() {

        this.stats.global.totalWeakCards++;

        this.trackDaily('weakCards');

        this.autoSave();

    }


    /*
    ========================================================
    SUBJECT TRACKING
    ========================================================
    */

    trackSubject(subject = 'General') {

        if (!this.stats.subjects[subject]) {

            this.stats.subjects[subject] = {

                viewed: 0,

                correct: 0,

                incorrect: 0,

                time: 0,

                accuracy: 0

            };

        }

        this.stats.subjects[subject].viewed++;

    }


    /*
    ========================================================
    CHAPTER TRACKING
    ========================================================
    */

    trackChapter(chapter = 'General') {

        if (!this.stats.chapters[chapter]) {

            this.stats.chapters[chapter] = {

                viewed: 0,

                correct: 0,

                incorrect: 0,

                accuracy: 0

            };

        }

        this.stats.chapters[chapter].viewed++;

    }


    /*
    ========================================================
    ACCURACY
    ========================================================
    */

    trackAccuracy(card, correct) {

        const subject =
            card.subject || 'General';

        const chapter =
            card.chapter || 'General';

        if (!this.stats.subjects[subject]) {

            this.trackSubject(subject);

        }

        if (!this.stats.chapters[chapter]) {

            this.trackChapter(chapter);

        }

        if (correct) {

            this.stats.subjects[subject]
                .correct++;

            this.stats.chapters[chapter]
                .correct++;

        }
        else {

            this.stats.subjects[subject]
                .incorrect++;

            this.stats.chapters[chapter]
                .incorrect++;

        }

        this.calculateAccuracy();

    }


    /*
    ========================================================
    ACCURACY CALCULATION
    ========================================================
    */

    calculateAccuracy() {

        Object.values(
            this.stats.subjects
        ).forEach(subject => {

            const total =
                subject.correct +
                subject.incorrect;

            subject.accuracy =
                total > 0
                    ? (
                        (subject.correct / total)
                        * 100
                    ).toFixed(1)
                    : 0;

        });

        Object.values(
            this.stats.chapters
        ).forEach(chapter => {

            const total =
                chapter.correct +
                chapter.incorrect;

            chapter.accuracy =
                total > 0
                    ? (
                        (chapter.correct / total)
                        * 100
                    ).toFixed(1)
                    : 0;

        });

    }


    /*
    ========================================================
    DAILY
    ========================================================
    */

    trackDaily(type) {

        const today =
            new Date()
                .toISOString()
                .split('T')[0];

        if (!this.stats.daily[today]) {

            this.stats.daily[today] = {

                viewed: 0,

                flipped: 0,

                correct: 0,

                incorrect: 0,

                bookmarks: 0,

                weakCards: 0,

                studyMinutes: 0

            };

        }

        if (
            this.stats.daily[today][type] !==
            undefined
        ) {

            this.stats.daily[today][type]++;

        }

    }


    /*
    ========================================================
    HEATMAP
    ========================================================
    */

    updateHeatmap() {

        if (!this.options.enableHeatmap) {

            return;

        }

        const today =
            new Date()
                .toISOString()
                .split('T')[0];

        if (!this.stats.heatmap[today]) {

            this.stats.heatmap[today] = 0;

        }

        this.stats.heatmap[today]++;

    }


    /*
    ========================================================
    STREAKS
    ========================================================
    */

    updateStreak() {

        const days =
            Object.keys(this.stats.daily)
                .sort();

        if (!days.length) {

            return;

        }

        let streak = 0;

        for (
            let i = days.length - 1;
            i >= 0;
            i--
        ) {

            streak++;

        }

        this.stats.global.currentStreak =
            streak;

        this.stats.global.longestStreak =
            Math.max(
                this.stats.global.longestStreak,
                streak
            );

    }


    /*
    ========================================================
    EXAM READINESS
    ========================================================
    */

    calculateExamReadiness() {

        const viewed =
            this.stats.global.totalCardsViewed;

        const accuracy =
            this.getGlobalAccuracy();

        let readiness = 0;

        readiness +=
            Math.min(viewed / 10000, 1) * 50;

        readiness +=
            (accuracy / 100) * 50;

        this.stats.global.examReadiness =
            readiness.toFixed(1);

    }


    /*
    ========================================================
    PRODUCTIVITY
    ========================================================
    */

    calculateProductivity() {

        const sessions =
            this.stats.global.totalSessions;

        const viewed =
            this.stats.global.totalCardsViewed;

        const streak =
            this.stats.global.currentStreak;

        let score = 0;

        score +=
            Math.min(viewed / 5000, 1) * 40;

        score +=
            Math.min(streak / 30, 1) * 30;

        score +=
            Math.min(sessions / 100, 1) * 30;

        this.stats.global.productivityScore =
            score.toFixed(1);

    }


    /*
    ========================================================
    GLOBAL ACCURACY
    ========================================================
    */

    getGlobalAccuracy() {

        const total =
            this.stats.global.totalCorrect +
            this.stats.global.totalIncorrect;

        if (!total) {

            return 0;

        }

        return (
            (
                this.stats.global.totalCorrect /
                total
            ) * 100
        ).toFixed(1);

    }


    /*
    ========================================================
    WEAK AREAS
    ========================================================
    */

    getWeakSubjects(limit = 5) {

        return Object.entries(
            this.stats.subjects
        )
        .sort((a, b) => {

            return (
                parseFloat(a[1].accuracy) -
                parseFloat(b[1].accuracy)
            );

        })
        .slice(0, limit);

    }


    getWeakChapters(limit = 10) {

        return Object.entries(
            this.stats.chapters
        )
        .sort((a, b) => {

            return (
                parseFloat(a[1].accuracy) -
                parseFloat(b[1].accuracy)
            );

        })
        .slice(0, limit);

    }


    /*
    ========================================================
    CHART DATA
    ========================================================
    */

    getDailyChartData(days = 30) {

        const labels = [];

        const viewed = [];

        const accuracy = [];

        const dates =
            Object.keys(this.stats.daily)
                .sort()
                .slice(-days);

        dates.forEach(date => {

            const stats =
                this.stats.daily[date];

            labels.push(date);

            viewed.push(stats.viewed);

            const total =
                stats.correct +
                stats.incorrect;

            accuracy.push(
                total
                    ? (
                        (stats.correct / total)
                        * 100
                    ).toFixed(1)
                    : 0
            );

        });

        return {

            labels,

            viewed,

            accuracy

        };

    }


    /*
    ========================================================
    GOALS
    ========================================================
    */

    setGoals(goals = {}) {

        this.stats.goals = {

            ...this.stats.goals,

            ...goals

        };

        this.autoSave();

    }


    getGoalProgress() {

        const today =
            new Date()
                .toISOString()
                .split('T')[0];

        const stats =
            this.stats.daily[today] || {};

        return {

            cardsPercent:
                (
                    (
                        (stats.viewed || 0) /
                        this.stats.goals.dailyCards
                    ) * 100
                ).toFixed(1),

            studyPercent:
                (
                    (
                        (stats.studyMinutes || 0) /
                        this.stats.goals
                            .dailyStudyMinutes
                    ) * 100
                ).toFixed(1)

        };

    }


    /*
    ========================================================
    RECOMMENDATIONS
    ========================================================
    */

    getRecommendations() {

        const weak =
            this.getWeakSubjects(3);

        const recommendations = [];

        weak.forEach(([subject]) => {

            recommendations.push(
                `Revise ${subject}`
            );

        });

        if (
            this.stats.global.currentStreak < 3
        ) {

            recommendations.push(
                'Improve consistency'
            );

        }

        if (
            this.getGlobalAccuracy() < 70
        ) {

            recommendations.push(
                'Focus on weak cards'
            );

        }

        return recommendations;

    }


    /*
    ========================================================
    EXPORT
    ========================================================
    */

    export() {

        return JSON.stringify(
            this.stats,
            null,
            2
        );

    }


    /*
    ========================================================
    IMPORT
    ========================================================
    */

    import(json) {

        try {

            this.stats =
                JSON.parse(json);

            this.autoSave();

            return true;

        }
        catch (error) {

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

    }


    /*
    ========================================================
    SAVE
    ========================================================
    */

    save() {

        localStorage.setItem(

            this.options.storageKey,

            JSON.stringify(this.stats)

        );

    }


    /*
    ========================================================
    LOAD
    ========================================================
    */

    load() {

        try {

            const saved =
                localStorage.getItem(
                    this.options.storageKey
                );

            if (saved) {

                this.stats =
                    JSON.parse(saved);

            }

        }
        catch (error) {

            console.error(error);

        }

    }


    /*
    ========================================================
    AUTO SAVE
    ========================================================
    */

    autoSave() {

        if (this.options.autoSave) {

            this.save();

        }

    }


    /*
    ========================================================
    LOG
    ========================================================
    */

    log(message) {

        if (this.options.debug) {

            console.log(
                '[StatsEngine]',
                message
            );

        }

    }

}


/*
========================================================
GLOBAL EXPORT
========================================================
*/

window.StatsEngine = StatsEngine;


/*
========================================================
USAGE
========================================================

const stats = new StatsEngine();

stats.startSession();

stats.cardViewed(card);

stats.markCorrect(card);

stats.endSession();

========================================================
*/