// Premise pairs are adjacent grid squares. Fixing the first point at the origin
// removes translations; compass directions retain their absolute orientation.
const UNCERTAINTY_DIRECTIONS = [
    { name: 'North', coord: [0, 1] },
    { name: 'North-East', coord: [1, 1] },
    { name: 'East', coord: [1, 0] },
    { name: 'South-East', coord: [1, -1] },
    { name: 'South', coord: [0, -1] },
    { name: 'South-West', coord: [-1, -1] },
    { name: 'West', coord: [-1, 0] },
    { name: 'North-West', coord: [-1, 1] },
];

const UNCERTAINTY_INSTRUCTIONS = 'Every pair named in a premise is one grid step apart (including diagonals). Other points may share a square. ALWAYS holds in every possible layout; SOMETIMES holds in some but not all; NEVER holds in none. ONLY lists the permitted directions when that list is shorter. Every layout allowed by the premises counts. Conclusions describe compass directions at any distance. MUST BE = all layouts; COULD OR COULD NOT BE = some but not all; COULD NOT BE = none.';

function uncertaintyInteger(value, fallback, min, max) {
    const parsed = Number(value);
    return value === null || value === '' || !Number.isFinite(parsed)
        ? fallback : Math.max(min, Math.min(max, Math.floor(parsed)));
}

function getUncertaintyLayoutRange(settings = savedata) {
    const min = uncertaintyInteger(settings.uncertaintyMinLayouts, 2, 2, 8);
    const max = uncertaintyInteger(settings.uncertaintyMaxLayouts, 4, 2, 8);
    return [Math.min(min, max), Math.max(min, max)];
}

function getUncertaintyConclusionCount(settings = savedata) {
    return uncertaintyInteger(settings.uncertaintyConclusions, 1, 1, 5);
}

function uncertaintySelectConclusions(candidates, count) {
    const answers = ['must', 'could', 'cannot'];
    const capacity = Math.min(count, ...answers.map(answer => candidates[answer].length));
    if (!capacity || capacity * answers.length < count) {
        throw new Error('Not enough distinct indirect conclusions to balance all three answers.');
    }
    // Equal numbers of answer tickets give each position a 1/3 marginal
    // probability, irrespective of the number of matching spatial relations.
    // Start a fresh bag for each problem; repeated answers are allowed, without
    // forcing one of each in every three-conclusion question.
    const tickets = uncertaintyShuffle(answers.flatMap(answer => Array(capacity).fill(answer)));
    const remaining = Object.fromEntries(answers.map(answer => [answer, candidates[answer].slice()]));
    return tickets.slice(0, count).map(answer => {
        const pool = remaining[answer];
        return pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    });
}

function uncertaintyPremiseCount(length) {
    // Premise overrides are applied before this cap. At eight layouts every
    // premise introduces an edge, so we need one more unique point than rows.
    const stimulusCap = typeof maxStimuliAllowed === 'function' ? maxStimuliAllowed() : 50;
    const maximum = Number.isFinite(stimulusCap) ? Math.max(3, Math.min(50, stimulusCap)) : 50;
    return uncertaintyInteger(length, Math.min(3, maximum), 3, maximum);
}

function uncertaintyUniqueStimuli(count) {
    const used = new Set();
    return createStimuli(count).map((word, index) => {
        let uniqueWord = word;
        // Existing mixed stimulus pools can return the same label. Preserve
        // identity with a deterministic replacement if that happens.
        for (let suffix = 1; used.has(uniqueWord); suffix++) {
            uniqueWord = `Point ${index + 1}${suffix === 1 ? '' : `-${suffix}`}`;
        }
        used.add(uniqueWord);
        return uniqueWord;
    });
}

function uncertaintyPick(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function uncertaintyShuffle(items) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function uncertaintyEscape(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);
}

function uncertaintyRelationHTML(relation) {
    const modal = relation.modality ? `<strong>${relation.modality}</strong> ` : '';
    const directions = relation.directions || [relation.direction];
    const names = directions.map(uncertaintyEscape);
    const directionText = names.length > 1
        ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}` : names[0];
    return `<span class="subject">${uncertaintyEscape(relation.subject)}</span> <span class="relation">is ${modal}${directionText} of</span> <span class="subject">${uncertaintyEscape(relation.reference)}</span>`;
}

function uncertaintyPremiseHTML(premise) {
    // This complement is valid for finite premises: the pair occupies one of
    // exactly eight neighboring squares. Keep the stored NEVER constraint and
    // the shared renderer intact, since infinite NEVER uses half-plane rules.
    if (premise.modality === 'NEVER' && premise.directions.length > 4) {
        return uncertaintyRelationHTML({
            ...premise,
            modality: 'ONLY',
            directions: UNCERTAINTY_DIRECTIONS
                .filter(direction => !premise.directions.includes(direction.name))
                .map(direction => direction.name),
        });
    }
    return uncertaintyRelationHTML(premise);
}

function uncertaintyRelationHolds(layout, relation) {
    const subject = layout[relation.subject];
    const reference = layout[relation.reference];
    const direction = UNCERTAINTY_DIRECTIONS.find(item => item.name === relation.direction);
    return !!(subject && reference && direction && direction.coord.every((component, axis) =>
        Math.sign(subject[axis] - reference[axis]) === component));
}

function classifyUncertaintyConclusion(layouts, relation) {
    if (layouts.length === 0) {
        throw new Error('An uncertainty question must have at least one possible layout.');
    }
    const matchingLayoutCount = layouts.filter(layout => uncertaintyRelationHolds(layout, relation)).length;
    return {
        correctAnswer: matchingLayoutCount === layouts.length ? 'must'
            : matchingLayoutCount === 0 ? 'cannot' : 'could',
        matchingLayoutCount,
    };
}

const uncertaintyBackboneCache = new Map();

function uncertaintyBackbones(layoutCount) {
    if (uncertaintyBackboneCache.has(layoutCount)) return uncertaintyBackboneCache.get(layoutCount);
    const templates = [];
    // Exhaust all small three-edge backbones once per layout count. Retain
    // only those with two distinct indirect conclusions in EVERY answer class.
    // Longer problems extend this backbone without changing its deductions.
    for (let mask = 1; mask < 256; mask++) {
        const allowed = UNCERTAINTY_DIRECTIONS.filter((_, index) => mask & (1 << index));
        if (allowed.length !== layoutCount) continue;
        for (const first of UNCERTAINTY_DIRECTIONS) {
            for (const second of UNCERTAINTY_DIRECTIONS) {
                const offset = first.coord.map((value, axis) => value + second.coord[axis]);
                let must = offset.some(value => value !== 0) ? 1 : 0;
                let could = 0;
                for (const base of [second.coord, offset]) {
                    const bearings = new Set(allowed.map(direction => direction.coord.map((value, axis) =>
                        Math.sign(value + base[axis])).join(',')));
                    if (bearings.size === 1) {
                        if (!bearings.has('0,0')) must++;
                    } else {
                        could += bearings.size - Number(bearings.has('0,0'));
                    }
                }
                // There are eight directions for each of the three indirect
                // pairs; two MUST plus at least two COULD leave many CANNOTs.
                if (must >= 2 && could >= 2) templates.push({ first, second, allowed });
            }
        }
    }
    if (!templates.length) throw new Error('No balanced uncertainty backbone for this layout count.');
    uncertaintyBackboneCache.set(layoutCount, templates);
    return templates;
}

function createUncertaintyQuestion(length, settings = savedata) {
    const premiseCount = uncertaintyPremiseCount(length);
    const [minLayouts, maxLayouts] = getUncertaintyLayoutRange(settings);
    const layoutCount = minLayouts + Math.floor(Math.random() * (maxLayouts - minLayouts + 1));
    const backbone = uncertaintyPick(uncertaintyBackbones(layoutCount));
    const allowedDirections = backbone.allowed;
    const forbiddenDirections = UNCERTAINTY_DIRECTIONS.filter(direction => !allowedDirections.includes(direction));

    // NEVER alone specifies the uncertain edge's complete allowed set. At the
    // three-row minimum, leave room for two ALWAYS steps so indirect MUSTs are
    // possible. Add SOMETIMES when space permits, or when all eight steps fit.
    const includeSometimes = premiseCount > 3 || !forbiddenDirections.length;
    const edgeCount = premiseCount - (forbiddenDirections.length && includeSometimes ? 1 : 0);
    const words = uncertaintyUniqueStimuli(edgeCount + 1);
    const uncertainEdge = 2;
    const edges = Array.from({ length: edgeCount }, (_, index) => ({
        subject: words[index + 1],
        reference: words[index],
        directions: index === uncertainEdge ? allowedDirections
            : [index === 0 ? backbone.first : index === 1 ? backbone.second : uncertaintyPick(UNCERTAINTY_DIRECTIONS)],
    }));
    const premiseConstraints = [];
    edges.forEach((edge, index) => {
        const relation = { subject: edge.subject, reference: edge.reference };
        if (index === uncertainEdge) {
            if (includeSometimes) {
                premiseConstraints.push({ ...relation, modality: 'SOMETIMES', directions: [uncertaintyPick(allowedDirections).name] });
            }
            if (forbiddenDirections.length) {
                premiseConstraints.push({ ...relation, modality: 'NEVER', directions: forbiddenDirections.map(direction => direction.name) });
            }
        } else {
            premiseConstraints.push({ ...relation, modality: 'ALWAYS', directions: [edge.directions[0].name] });
        }
    });

    // This enumerates every allowed layout, not a sample: only one edge varies,
    // its eight neighboring squares are exhaustive, and NEVER excludes the rest.
    const layouts = allowedDirections.map(uncertainDirection => {
        const layout = { [words[0]]: [0, 0] };
        edges.forEach((edge, index) => {
            const direction = index === uncertainEdge ? uncertainDirection : edge.directions[0];
            layout[edge.subject] = direction.coord.map((value, axis) => value + layout[edge.reference][axis]);
        });
        return layout;
    });

    const candidates = { must: [], could: [], cannot: [] };
    // Every conclusion joins points separated by at least two edges. Enumerate
    // each unordered pair once so a reversed, opposite direction cannot repeat
    // the same conclusion in a multiple-conclusion question.
    for (let subjectIndex = 2; subjectIndex < words.length; subjectIndex++) {
        for (let referenceIndex = 0; referenceIndex < subjectIndex - 1; referenceIndex++) {
            for (const direction of UNCERTAINTY_DIRECTIONS) {
                const relation = { subject: words[subjectIndex], reference: words[referenceIndex], direction: direction.name };
                const result = classifyUncertaintyConclusion(layouts, relation);
                candidates[result.correctAnswer].push({
                    relation,
                    ...result,
                });
            }
        }
    }
    // The backbone supplies all three classes, including at least two MUSTs;
    // candidate pool sizes must never change an answer's selection probability.
    const conclusionCount = getUncertaintyConclusionCount(settings);
    const conclusions = uncertaintySelectConclusions(candidates, conclusionCount).map(chosen => ({
        conclusion: uncertaintyRelationHTML(chosen.relation),
        conclusionRelation: chosen.relation,
        correctAnswer: chosen.correctAnswer,
        matchingLayoutCount: chosen.matchingLayoutCount,
    }));
    const orderedConstraints = uncertaintyShuffle(premiseConstraints);
    const countdown = Number(settings.overrideUncertaintyTime);
    return {
        category: 'Uncertainty RRT',
        type: 'uncertainty',
        instructions: UNCERTAINTY_INSTRUCTIONS,
        premises: orderedConstraints.map(uncertaintyPremiseHTML),
        premiseConstraints: orderedConstraints,
        layouts,
        layoutCount,
        conclusions,
        ...conclusions[0],
        modifiers: [`layouts${layoutCount}`, ...(conclusionCount > 1 ? [`conclusions${conclusionCount}`] : [])],
        startedAt: new Date().getTime(),
        plen: premiseCount,
        ...(Number.isFinite(countdown) && countdown > 0 && { countdown }),
    };
}

class UncertaintyQuestion {
    create(length) {
        return createUncertaintyQuestion(length);
    }
}

function createUncertaintyGenerator(length) {
    return {
        question: new UncertaintyQuestion(),
        premiseCount: uncertaintyPremiseCount(getPremisesFor('overrideUncertaintyPremises', length)),
        weight: savedata.overrideUncertaintyWeight,
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        UNCERTAINTY_DIRECTIONS,
        UNCERTAINTY_INSTRUCTIONS,
        getUncertaintyLayoutRange,
        getUncertaintyConclusionCount,
        uncertaintySelectConclusions,
        uncertaintyRelationHolds,
        classifyUncertaintyConclusion,
        createUncertaintyQuestion,
        createUncertaintyGenerator,
    };
}
