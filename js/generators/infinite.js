// Infinite mode compares coordinate order, never a fixed distance or a bounded
// grid. Strict inequalities can be represented by a gap of one when FINDING a
// witness: any finite feasible ordering of real coordinates has integer ranks.
// This does not constrain the distances in the layouts being quantified over.
const INFINITE_DIRECTIONS = typeof UNCERTAINTY_DIRECTIONS !== 'undefined'
    ? UNCERTAINTY_DIRECTIONS : require('./uncertainty.js').UNCERTAINTY_DIRECTIONS;
const infiniteConclusionCount = typeof getUncertaintyConclusionCount === 'function'
    ? getUncertaintyConclusionCount : require('./uncertainty.js').getUncertaintyConclusionCount;
const infiniteSelectConclusions = typeof uncertaintySelectConclusions === 'function'
    ? uncertaintySelectConclusions : require('./uncertainty.js').uncertaintySelectConclusions;

const INFINITE_INSTRUCTIONS = 'Distances are unlimited; no premise fixes a one-step gap. ALWAYS North means directly North at any distance (the same horizontal position); other cardinal directions work the same way. Diagonals describe quadrants, with no equal-distance requirement. NEVER North excludes the entire northern half-plane, including North-East and North-West; NEVER South, East and West work the same way. NEVER a diagonal excludes that quadrant. SOMETIMES means the exact direction holds in some but not all layouts allowed by ALWAYS and NEVER. Unconstrained points may overlap. Conclusions use exact compass directions at any distance. MUST BE = every allowed layout; COULD OR COULD NOT BE = some but not all; COULD NOT BE = none.';

function infiniteDirection(name) {
    const direction = INFINITE_DIRECTIONS.find(item => item.name === name);
    if (!direction) throw new Error(`Unknown infinite-mode direction: ${name}`);
    return direction;
}

function infiniteDirections(relation) {
    const directions = relation.directions || [relation.direction];
    if (!directions.length) throw new Error('An infinite-mode relation needs a direction.');
    directions.forEach(infiniteDirection);
    return directions;
}

function infiniteRelationHolds(layout, relation) {
    const subject = layout[relation.subject];
    const reference = layout[relation.reference];
    if (!subject || !reference) return false;
    return infiniteDirections(relation).some(name => infiniteDirection(name).coord.every((sign, axis) =>
        Math.sign(subject[axis] - reference[axis]) === sign));
}

// SOMETIMES describes the whole solution set, so it never filters one layout.
function infinitePremiseHolds(layout, premise) {
    if (premise.modality === 'SOMETIMES') return true;
    if (premise.modality === 'ALWAYS') return infiniteRelationHolds(layout, premise);
    if (premise.modality !== 'NEVER') throw new Error('Unknown infinite-mode modality.');
    const subject = layout[premise.subject];
    const reference = layout[premise.reference];
    if (!subject || !reference) return false;
    return infiniteDirections(premise).every(name => !infiniteDirection(name).coord.every((sign, axis) =>
        sign === 0 || Math.sign(subject[axis] - reference[axis]) === sign));
}

// An atom [axis, from, to, strict] means coordinate[to] >= coordinate[from],
// with a strict inequality when strict=1. A clause is a disjunction of atom
// conjunctions. Independent axis orderings and finite logical branching give
// an exact feasibility test, without enumerating or sampling spatial layouts.
function infiniteDirectionAtoms(relation, name, indices) {
    const subject = indices.get(relation.subject);
    const reference = indices.get(relation.reference);
    return infiniteDirection(name).coord.flatMap((sign, axis) => sign === 0
        ? [[axis, reference, subject, 0], [axis, subject, reference, 0]]
        : [[axis, sign > 0 ? reference : subject, sign > 0 ? subject : reference, 1]]);
}

function infiniteNotDirectionClause(relation, name, indices, broadCardinal = false) {
    const subject = indices.get(relation.subject);
    const reference = indices.get(relation.reference);
    return infiniteDirection(name).coord.flatMap((sign, axis) => sign === 0
        ? (broadCardinal ? [] : [[[axis, subject, reference, 1]], [[axis, reference, subject, 1]]])
        : [[[axis, sign > 0 ? subject : reference, sign > 0 ? reference : subject, 0]]]);
}

function infiniteRelationClauses(relation, indices, holds) {
    const directions = infiniteDirections(relation);
    return holds
        ? [directions.map(name => infiniteDirectionAtoms(relation, name, indices))]
        : directions.map(name => infiniteNotDirectionClause(relation, name, indices));
}

function infiniteOrderWitness(count, atoms) {
    const coordinates = [Array(count).fill(0), Array(count).fill(0)];
    // Longest-path relaxation detects a positive cycle, which is precisely an
    // impossible strict ordering. Zero cycles correctly allow equal positions.
    for (let pass = 0; pass < count; pass++) {
        let changed = false;
        for (const [axis, from, to, strict] of atoms) {
            const required = coordinates[axis][from] + strict;
            if (coordinates[axis][to] < required) {
                coordinates[axis][to] = required;
                changed = true;
            }
        }
        if (!changed) return coordinates;
    }
    return null;
}

function infiniteFindWitness(prepared, extraClauses = []) {
    const atoms = [];
    const branches = [];
    for (const clause of prepared.clauses.concat(extraClauses)) {
        if (clause.length === 1) atoms.push(...clause[0]);
        else branches.push(clause);
    }
    function search(currentAtoms, branchIndex) {
        const coordinates = infiniteOrderWitness(prepared.words.length, currentAtoms);
        if (!coordinates) return null;
        if (branchIndex === branches.length) return coordinates;
        for (const alternative of branches[branchIndex]) {
            const result = search(currentAtoms.concat(alternative), branchIndex + 1);
            if (result) return result;
        }
        return null;
    }
    const coordinates = search(atoms, 0);
    if (!coordinates) return null;
    // Translate the first point to the origin for compact visual examples.
    return Object.fromEntries(prepared.words.map((word, index) => [word,
        coordinates.map(axis => axis[index] - axis[0]),
    ]));
}

function infinitePrepare(premises, additionalRelations = []) {
    const words = [...new Set(premises.concat(additionalRelations).flatMap(p => [p.subject, p.reference]))];
    const indices = new Map(words.map((word, index) => [word, index]));
    const clauses = [];
    for (const premise of premises) {
        const directions = infiniteDirections(premise);
        if (premise.modality === 'ALWAYS') clauses.push(...infiniteRelationClauses(premise, indices, true));
        else if (premise.modality === 'NEVER') {
            clauses.push(...directions.map(name => infiniteNotDirectionClause(premise, name, indices, true)));
        } else if (premise.modality !== 'SOMETIMES') throw new Error('Unknown infinite-mode modality.');
    }
    const prepared = { words, indices, clauses };
    prepared.baseWitness = infiniteFindWitness(prepared);
    if (!prepared.baseWitness) throw new Error('Infinite-mode premises must allow at least one layout.');
    for (const premise of premises.filter(p => p.modality === 'SOMETIMES')) {
        if (!infiniteFindWitness(prepared, infiniteRelationClauses(premise, indices, true))
            || !infiniteFindWitness(prepared, infiniteRelationClauses(premise, indices, false))) {
            throw new Error('SOMETIMES must hold in some but not all layouts allowed by ALWAYS and NEVER.');
        }
    }
    return prepared;
}

function infiniteClassifyPrepared(prepared, relation) {
    const matching = infiniteFindWitness(prepared, infiniteRelationClauses(relation, prepared.indices, true));
    const counterexample = infiniteFindWitness(prepared, infiniteRelationClauses(relation, prepared.indices, false));
    return {
        correctAnswer: !matching ? 'cannot' : !counterexample ? 'must' : 'could',
        witnesses: [
            ...(matching ? [{ layout: matching, holds: true }] : []),
            ...(counterexample ? [{ layout: counterexample, holds: false }] : []),
        ],
    };
}

function classifyInfiniteConclusion(premiseConstraints, relation) {
    return infiniteClassifyPrepared(infinitePrepare(premiseConstraints, [relation]), relation);
}

function infinitePremiseCount(length) {
    const stimulusCap = typeof maxStimuliAllowed === 'function' ? maxStimuliAllowed() : 20;
    const maximum = Number.isFinite(stimulusCap) ? Math.max(3, Math.min(20, stimulusCap)) : 20;
    const parsed = Number(length);
    return length === null || length === '' || !Number.isFinite(parsed)
        ? 3 : Math.max(3, Math.min(maximum, Math.floor(parsed)));
}

function infinitePick(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function infiniteShuffle(items) {
    const result = items.slice();
    for (let index = result.length - 1; index > 0; index--) {
        const other = Math.floor(Math.random() * (index + 1));
        [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
}

function infiniteUniqueStimuli(count) {
    if (typeof uncertaintyUniqueStimuli === 'function') return uncertaintyUniqueStimuli(count);
    const used = new Set();
    return createStimuli(count).map((word, index) => {
        let unique = word;
        for (let suffix = 1; used.has(unique); suffix++) unique = `Point ${index + 1}-${suffix}`;
        used.add(unique);
        return unique;
    });
}

function infiniteRelationHTML(relation) {
    if (typeof uncertaintyRelationHTML === 'function') return uncertaintyRelationHTML(relation);
    const escape = value => String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);
    const modal = relation.modality ? `<strong>${escape(relation.modality)}</strong> ` : '';
    return `<span class="subject">${escape(relation.subject)}</span> <span class="relation">is ${modal}${infiniteDirections(relation).map(escape).join(' or ')} of</span> <span class="subject">${escape(relation.reference)}</span>`;
}

function createInfiniteQuestion(length, settings = savedata) {
    const premiseCount = infinitePremiseCount(length);
    const words = infiniteUniqueStimuli(premiseCount < 5 ? premiseCount + 1 : premiseCount);
    const quarterTurns = Math.floor(Math.random() * 4);
    const reflected = Math.random() < 0.5;
    const transformDirection = name => {
        let [x, y] = infiniteDirection(name).coord;
        if (reflected) x = -x;
        for (let turn = 0; turn < quarterTurns; turn++) [x, y] = [-y, x];
        return INFINITE_DIRECTIONS.find(direction => direction.coord[0] === x && direction.coord[1] === y).name;
    };
    const premises = [];
    const append = (index, modality, directions) => premises.push({
        subject: words[index], reference: words[index - 1], modality,
        directions: directions.map(transformDirection),
    });
    // Each backbone supplies at least two different indirect MUST conclusions
    // and two COULD conclusions. Unbounded distances themselves can introduce
    // uncertainty, even when every premise in the first backbone is ALWAYS.
    // Rotate and reflect the whole construction to vary its compass directions.
    if (premiseCount !== 4 && Math.random() < 0.5) {
        append(1, 'ALWAYS', ['North-East']);
        append(2, 'ALWAYS', ['North']);
        append(3, 'ALWAYS', ['North-West']);
    } else {
        append(1, 'ALWAYS', ['East']);
        append(2, 'ALWAYS', ['North']);
        append(3, 'NEVER', ['South', 'West']);
    }
    if (premiseCount >= 4) {
        const uncertainPair = { subject: words[4], reference: words[3] };
        let possibleDirections = INFINITE_DIRECTIONS;
        if (premiseCount >= 5) {
            const forbidden = infinitePick(INFINITE_DIRECTIONS.filter(direction => direction.coord.includes(0)));
            const forbiddenAxis = forbidden.coord[0] === 0 ? 1 : 0;
            possibleDirections = INFINITE_DIRECTIONS.filter(direction =>
                direction.coord[forbiddenAxis] !== forbidden.coord[forbiddenAxis]);
            premises.push({ ...uncertainPair, modality: 'NEVER', directions: [forbidden.name] });
        }
        premises.push({ ...uncertainPair, modality: 'SOMETIMES', directions: [infinitePick(possibleDirections).name] });
    }
    for (let index = 5; index < words.length; index++) {
        premises.push({ subject: words[index], reference: words[index - 1],
            modality: 'ALWAYS', directions: [infinitePick(INFINITE_DIRECTIONS).name] });
    }
    const prepared = infinitePrepare(premises);
    // Keep the backbone's indirect pairs when bounding solver work for long
    // questions; sampling them away could remove an entire answer class.
    // Never use directly premised pairs, including reversals.
    const corePairs = [
        { subject: words[2], reference: words[0] },
        { subject: words[3], reference: words[0] },
        { subject: words[3], reference: words[1] },
    ];
    const pairs = [];
    for (let subject = 4; subject < words.length; subject++) {
        for (let reference = 0; reference < subject - 1; reference++) {
            pairs.push({ subject: words[subject], reference: words[reference] });
        }
    }
    const candidates = { must: [], could: [], cannot: [] };
    for (const pair of corePairs.concat(infiniteShuffle(pairs).slice(0, 29))) {
        for (const direction of INFINITE_DIRECTIONS) {
            const relation = { ...pair, direction: direction.name };
            const result = infiniteClassifyPrepared(prepared, relation);
            candidates[result.correctAnswer].push({ relation, ...result });
        }
    }
    const conclusionCount = infiniteConclusionCount(settings);
    const conclusions = infiniteSelectConclusions(candidates, conclusionCount).map(chosen => ({
        conclusion: infiniteRelationHTML(chosen.relation),
        conclusionRelation: chosen.relation,
        correctAnswer: chosen.correctAnswer,
        witnesses: chosen.witnesses,
    }));
    const orderedConstraints = infiniteShuffle(premises);
    const countdown = Number(settings.overrideInfiniteTime);
    return {
        category: 'Infinite mode',
        type: 'infinite',
        instructions: INFINITE_INSTRUCTIONS,
        premises: orderedConstraints.map(infiniteRelationHTML),
        premiseConstraints: orderedConstraints,
        conclusions,
        ...conclusions[0],
        modifiers: ['unbounded', ...(conclusionCount > 1 ? [`conclusions${conclusionCount}`] : [])],
        startedAt: new Date().getTime(),
        plen: premiseCount,
        ...(Number.isFinite(countdown) && countdown > 0 && { countdown }),
    };
}

class InfiniteQuestion {
    create(length) {
        return createInfiniteQuestion(length);
    }
}

function createInfiniteGenerator(length) {
    return {
        question: new InfiniteQuestion(),
        premiseCount: infinitePremiseCount(getPremisesFor('overrideInfinitePremises', length)),
        weight: savedata.overrideInfiniteWeight,
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        INFINITE_INSTRUCTIONS,
        infiniteRelationHolds,
        infinitePremiseHolds,
        infinitePremiseCount,
        classifyInfiniteConclusion,
        createInfiniteQuestion,
        createInfiniteGenerator,
    };
}
