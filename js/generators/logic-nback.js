// Logic N-Back: Running Sliding-Window Relational Reasoning Engine
class LogicNBackStream {
    constructor(n = 3, relationType = 'comparison') {
        this.n = Math.max(2, Math.min(8, n || 3));
        this.relationType = relationType;
        this.reset();
    }

    reset(n) {
        if (n !== undefined) {
            this.n = Math.max(2, Math.min(8, n || 3));
        }
        this.step = 0;
        this.activeChain = [];       // Array of active entity words/tokens
        this.activePremises = [];    // Array of premise objects connecting consecutive entities
        this.currentPremise = null;
        this.usedWordsSet = new Set();
        this.generator = this.getLinearGenerator();
    }

    getLinearGenerator() {
        const wording = this.relationType || 'comparison';
        if (wording === 'temporal') return typeof BEFORE_AFTER !== 'undefined' ? BEFORE_AFTER : MORE_LESS;
        if (wording === 'topunder') return typeof TOP_UNDER !== 'undefined' ? TOP_UNDER : MORE_LESS;
        if (wording === 'contains') return typeof CONTAINS_WITHIN !== 'undefined' ? CONTAINS_WITHIN : MORE_LESS;
        if (wording === 'leftright') return typeof LEFT_RIGHT !== 'undefined' ? LEFT_RIGHT : MORE_LESS;
        return typeof MORE_LESS !== 'undefined' ? MORE_LESS : {
            forwards: (a, b) => ({ start: a, end: b, relation: 'is less than', reverse: 'is more than', relationMinimal: '<', reverseMinimal: '>' }),
            getName: () => 'Comparison'
        };
    }

    getNextEntity() {
        // Generate candidate words using existing stimuli infrastructure if available
        let attempts = 0;
        while (attempts < 20) {
            attempts++;
            let candidate;
            if (typeof createStimuli === 'function') {
                const stimuli = createStimuli(3);
                candidate = stimuli.find(w => !this.activeChain.includes(w) && !this.usedWordsSet.has(w)) || stimuli[0];
            } else {
                const pool = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T'];
                candidate = pool[Math.floor(Math.random() * pool.length)] + (this.step + 1);
            }
            if (!this.activeChain.includes(candidate)) {
                this.usedWordsSet.add(candidate);
                // Keep used words bounded
                if (this.usedWordsSet.size > 50) {
                    this.usedWordsSet.clear();
                    this.activeChain.forEach(w => this.usedWordsSet.add(w));
                }
                return candidate;
            }
        }
        return `X${this.step + 1}`;
    }

    nextStep() {
        this.step++;
        this.generator = this.getLinearGenerator();

        // 1. Manage entity chain and premises
        if (this.activeChain.length === 0) {
            // First step: need 2 entities to form the first premise
            const e0 = this.getNextEntity();
            const e1 = this.getNextEntity();
            this.activeChain = [e0, e1];
            const p0 = this.generator.forwards(e0, e1);
            this.activePremises = [p0];
            this.currentPremise = p0;
        } else {
            // If window is full (length >= n + 1), slide window
            if (this.activeChain.length >= this.n + 1) {
                this.activeChain.shift();
                this.activePremises.shift();
            }

            // Append new entity and new premise
            const prevTail = this.activeChain[this.activeChain.length - 1];
            const newTail = this.getNextEntity();
            this.activeChain.push(newTail);

            const newPremise = this.generator.forwards(prevTail, newTail);
            this.activePremises.push(newPremise);
            this.currentPremise = newPremise;
        }

        // 2. Determine phase: Filling vs Testing
        const isFilling = this.activePremises.length < this.n;

        // 3. Generate HTML for current premise
        let currentPremiseHTML = '';
        if (typeof createPremiseHTML === 'function') {
            currentPremiseHTML = createPremiseHTML(this.currentPremise);
        } else {
            currentPremiseHTML = `<span class="subject">${this.currentPremise.start}</span> <span class="relation">${this.currentPremise.relation}</span> <span class="subject">${this.currentPremise.end}</span>`;
        }

        // 4. Generate conclusion if in testing phase (activePremises.length >= n)
        let conclusionHTML = null;
        let isValid = null;

        if (!isFilling) {
            // Transitive inference across at least 2 steps in the active chain
            // activeChain has length this.n + 1
            const span = Math.min(this.n, Math.max(2, Math.floor(Math.random() * this.n) + 1));
            const maxStart = this.activeChain.length - 1 - span;
            const startIdx = Math.floor(Math.random() * (maxStart + 1));
            const endIdx = startIdx + span;

            const eA = this.activeChain[startIdx];
            const eB = this.activeChain[endIdx];

            // In our forward chain: startIdx < endIdx means eA is strictly ordered before eB (e.g. eA < eB)
            const makeTrue = (typeof coinFlip === 'function') ? coinFlip() : (Math.random() > 0.5);
            isValid = makeTrue;

            const testPremise = makeTrue
                ? this.generator.forwards(eA, eB)
                : this.generator.forwards(eB, eA);

            if (typeof createBasicPremiseHTML === 'function') {
                conclusionHTML = createBasicPremiseHTML(testPremise, false);
            } else {
                conclusionHTML = `<span class="subject">${testPremise.start}</span> <span class="relation">${testPremise.relation}</span> <span class="subject">${testPremise.end}</span>`;
            }
        }

        const countdown = (typeof savedata !== 'undefined' && savedata.overrideLogicNBackTime)
            ? savedata.overrideLogicNBackTime
            : ((typeof savedata !== 'undefined') ? savedata.timer : 30);

        return {
            type: 'logic-nback',
            category: `Logic N-Back (N = ${this.n})`,
            isFilling,
            stepNumber: this.step,
            windowSize: this.n,
            activeCount: this.activePremises.length,
            premises: this.activePremises.map(p => (typeof createPremiseHTML === 'function' ? createPremiseHTML(p) : `${p.start} ${p.relation} ${p.end}`)),
            currentPremise: this.currentPremise,
            currentPremiseHTML,
            activeChain: [...this.activeChain],
            conclusion: conclusionHTML,
            isValid,
            conclusionsList: conclusionHTML ? [{
                conclusion: conclusionHTML,
                isValid,
                isCorrect: null,
                answerUser: null
            }] : [],
            startedAt: new Date().getTime(),
            countdown
        };
    }
}

// Global instance
let LOGIC_NBACK_STREAM = new LogicNBackStream();
