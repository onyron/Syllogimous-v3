function createGridFromMap(wordCoordMap) {
    const entries = Object.entries(wordCoordMap);
    const low = structuredClone(entries[0][1]);
    const high = structuredClone(entries[0][1]);

    for (const [word, coord] of entries) {
        for (const i in coord) {
            low[i] = Math.min(low[i], coord[i])
            high[i] = Math.max(high[i], coord[i])
        }
    }

    const dimensions = low.map((l, i) => high[i] - l + 1);
    const createNArray = (i) => {
        if (i < 0)
            return '';
        return Array.from({ length: dimensions[i] }, (_, a) => createNArray(i-1));
    };
    const grid = createNArray(dimensions.length - 1);

    for (const [word, coord] of entries) {
        let curr = grid
        for (let i = coord.length - 1; i >= 0; i--) {
            const loc = coord[i] - low[i];
            if (!Array.isArray(curr[loc])) {
                curr[loc] += (curr[loc].length > 0 ? ',' : '') + word;
                break;
            }
            curr = curr[loc]
        }
    }

    return grid;
}

function centerText(text, width) {
    if (text.length > 50) {
        const half = Math.floor(width / 2);
        const padding = ' '.repeat(half);
        return padding + text + padding;
    }
    const totalPadding = width - text.length;
    const paddingStart = Math.floor(totalPadding / 2);
    return text.padStart(text.length + paddingStart).padEnd(width);
}

function createFiller(grid) {
    const lengths = grid.flat(Infinity).map(x => x.length > 50 ? 1 : x.length);
    const biggest = lengths.reduce((a, b) => Math.max(a, b));
    const neededLength = biggest + 2;
    return '\u00A0'.repeat(neededLength);
}

function fillTable(grid, filler) {
    let s = '';
    for (let i = grid.length - 1; i >= 0; i--) {
        const row = grid[i];
        for (const val of row) {
            s += '<div class="td">' + (val ? centerText(val, filler.length) : filler) + '</div>';
        }
    }
    return s;
}

function createExplanation2D(grid, filler, separatorFn) {
    if (!filler) {
        filler = createFiller(grid);
    }

    if (!separatorFn) {
        separatorFn = (s) => `<div class="table" style="grid-template-columns: repeat(${grid[0].length}, auto)">${s}</div>`;
    }

    return separatorFn(fillTable(grid, filler));
}

function createExplanation3D(grid, filler) {
    if (!filler) {
        filler = createFiller(grid);
    }
    const gridWidth = grid[0][0].length;
    let s = `<div class="three-d-scene">`
    for (let i = grid.length - 1; i >= 0; i--) {
        s += createExplanation2D(grid[i], filler, (s) => {
            return `<div class="table three-d-plane plane-${grid.length - i}" style="grid-template-columns: repeat(${gridWidth}, minmax(min-content, 1fr))">${s}</div>`
        });
    }
    s += '</div>'
    s += `<style>.three-d-plane .td { max-width: ${Math.floor((100 / gridWidth) - 4)}vw; }</style>`
    return s;
}

function createExplanation4D(grid) {
    const filler = createFiller(grid);
    let s = '<div class="four-d-scene" style="display: flex; gap: 0.5rem;">';
    for (let i = 0; i < grid.length; i++) {
        let time = i + 1;
        s += '<div>';
        s += '<div>Time ' + time + '</div>'
        s += createExplanation3D(grid[i], filler);
        s += '</div>';
    }
    s += '</div>'
    return s;
}

function createExplanationBucket(question) {
    if (question.category === 'Vertical') {
        return question.bucket.map(word => `<div>${word}</div>`).join('');
    } else if (question.category === 'Comparison') {
        return question.bucket.join(' < ');
    } else {
        return question.bucket.join(" ");
    }
}

function createExplanationBuckets(question) {
    if (question.category === 'Vertical') {
        return question.buckets
            .map(bucket => '<div style="justify-self: start;">' + bucket.join(' ') + '</div>')
            .join('<div class="divider"></div>');
    }
    const filler = createFiller(question.buckets);
    const verticalLength = question.buckets.reduce((a, b) => Math.max(a, b));
    let s = '<table class="distinction">';
    s += '<tr>';
    for (const bucket of question.buckets) {
        
        s += '<td>';
        for (const item of bucket) {
            s += '<div>' + centerText(item, filler.length) + '</div>';
        }
        s += '</td>';
    }
    s += '</tr>';
    s += '</table>';
    return s;
}

function createUncertaintyExplanation(question) {
    const layouts = question.layouts || [];
    const labels = { must: 'MUST BE', could: 'COULD OR COULD NOT BE', cannot: 'COULD NOT BE' };
    const meaning = {
        must: 'The conclusion holds in every possible layout.',
        could: 'The conclusion holds in some layouts, but not all.',
        cannot: 'The conclusion does not hold in any possible layout.',
    };
    const matchCount = question.matchingLayoutCount;
    const summary = `<div class="uncertainty-explanation-summary">
        <p>${question.conclusion}</p>
        <p><strong>${labels[question.correctAnswer] || ''}</strong></p>
        <p>${matchCount} of ${layouts.length} layouts satisfy the conclusion.</p>
        <p>${meaning[question.correctAnswer] || ''}</p>
        <p>North ↑ &middot; East →</p>
    </div>`;
    const layoutGrids = layouts.map((layout, index) => {
        const matches = uncertaintyRelationHolds(layout, question.conclusionRelation);
        const grid = createGridFromMap(layout);
        return `<section class="uncertainty-layout">
            <h3>Layout ${index + 1}</h3>
            <p>${matches ? 'Conclusion holds' : 'Conclusion does not hold'}</p>
            <div class="uncertainty-layout-grid">${createExplanation2D(grid)}</div>
        </section>`;
    }).join('');
    return `${summary}<div class="uncertainty-layouts">${layoutGrids}</div>`;
}

function createInfiniteExampleGrid(layout) {
    // Only coordinate order matters in infinite mode. Compact each axis to its
    // distinct ranks before allocating a grid: even very distant witnesses use
    // at most one row and column per point, without implying unit distances.
    const entries = Object.entries(layout || {});
    if (!entries.length) return '';
    const axes = [0, 1].map(axis => [...new Set(entries.map(([, coord]) => coord[axis]))]
        .sort((a, b) => a - b));
    const rankedLayout = Object.fromEntries(entries.map(([word, coord]) => [word,
        coord.map((value, axis) => axes[axis].indexOf(value))]));
    return createExplanation2D(createGridFromMap(rankedLayout));
}

function createInfiniteExplanation(question) {
    const labels = { must: 'MUST BE', could: 'COULD OR COULD NOT BE', cannot: 'COULD NOT BE' };
    const reasoning = {
        must: 'Every layout allowed by the premises satisfies the conclusion. The exact constraint check finds no possible counterexample.',
        could: 'The premises allow both a layout where the conclusion holds and a layout where it does not hold.',
        cannot: 'No layout allowed by the premises satisfies the conclusion. The exact constraint check finds the conclusion incompatible with the premises.',
    };
    const summary = `<div class="uncertainty-explanation-summary">
        <p>${question.conclusion}</p>
        <p><strong>${labels[question.correctAnswer] || ''}</strong></p>
        <p>${reasoning[question.correctAnswer] || ''}</p>
        <p>Positions and distances are unbounded. Grading checks the full constraints, not just the examples shown below.</p>
        <p>North &uarr; &middot; East &rarr;</p>
    </div>`;
    // Show at most one example of each outcome; these are witnesses, never an
    // enumeration of the infinitely many possible spatial layouts.
    const witnesses = [true, false].map(holds => (question.witnesses || [])
        .find(witness => witness.holds === holds && witness.layout))
        .filter(Boolean);
    const examples = witnesses.map(witness => `<section class="uncertainty-layout infinite-layout">
        <h3>${witness.holds ? 'Example: conclusion holds' : 'Example: conclusion does not hold'}</h3>
        <div class="uncertainty-layout-grid">${createInfiniteExampleGrid(witness.layout)}</div>
    </section>`).join('');
    const note = '<p class="infinite-example-note">These diagrams are illustrative examples. Spacing is arbitrary and compressed to show coordinate order; adjacent cells do not mean one-unit steps. Points in the same cell overlap.</p>';
    return `${summary}<div class="uncertainty-layouts">${examples}</div>${note}`;
}

function createLogicNBackExplanation(question) {
    const n = question.windowSize || 3;
    const step = question.stepNumber || 1;
    const chain = question.activeChain || [];
    const relMinimal = question.relationMinimal || '<';
    const relForwards = question.relationForwards || 'is less than';

    const chainDisplay = chain.length > 0
        ? chain
            .map(e => `<span style="color: #38bdf8; font-weight: bold;">${e}</span>`)
            .join(` <span style="color: #94a3b8; font-weight: normal;">${relMinimal}</span> `)
        : '<span style="color: #64748b;">(Empty buffer)</span>';

    const premisesList = (question.premises && question.premises.length > 0)
        ? question.premises
            .map((p, idx) => {
                const stepNum = Math.max(1, step - question.premises.length + idx + 1);
                return `<li style="margin: 4px 0;"><span style="color: #64748b;">[Step ${stepNum}]</span> ${p}</li>`;
            })
            .join('')
        : '<li style="color: #64748b;">None</li>';

    let deductionSection = '';
    if (question.isFilling) {
        deductionSection = `
            <div style="margin-top: 14px; padding: 10px 14px; background: rgba(56, 189, 248, 0.08); border-left: 3px solid #38bdf8; border-radius: 4px;">
                <div style="font-weight: bold; color: #38bdf8; margin-bottom: 4px;">Buffer Fill Phase (${question.activeCount || Math.max(0, chain.length - 1)} / ${n} steps)</div>
                <p style="margin: 0; color: #94a3b8; font-size: 0.9em;">
                    The sliding window is accumulating initial premises. No test conclusion was evaluated on this step.
                </p>
            </div>`;
    } else {
        const test = question.testPremise || {};
        const tested = question.testedEntities || {};
        const eA = tested.eA || (chain.length > 0 ? chain[0] : '');
        const eB = tested.eB || (chain.length > 0 ? chain[chain.length - 1] : '');
        const span = tested.span || (chain.length > 1 ? chain.length - 1 : 1);
        const isValid = question.isValid;
        const concHTML = question.conclusion || (test.start ? `${test.start} ${test.relation} ${test.end}` : '');

        const evalBadge = isValid
            ? `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: rgba(74, 222, 128, 0.15); color: #4ade80; font-weight: bold; border: 1px solid rgba(74, 222, 128, 0.3);">TRUE (VALID)</span>`
            : `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: rgba(248, 113, 113, 0.15); color: #f87171; font-weight: bold; border: 1px solid rgba(248, 113, 113, 0.3);">FALSE (INVALID)</span>`;

        const testStart = test.start || eA;
        const testRel = test.relation || relForwards;
        const testEnd = test.end || eB;

        const reasonText = isValid
            ? `In the active chain, <span style="color: #38bdf8;">${eA}</span> precedes <span style="color: #38bdf8;">${eB}</span> across ${span} transitive step(s). The conclusion asserts that <strong>${testStart}</strong> ${testRel} <strong>${testEnd}</strong>, which strictly matches the deduced order.`
            : `In the active chain, <span style="color: #38bdf8;">${eA}</span> precedes <span style="color: #38bdf8;">${eB}</span>. The conclusion asserts that <strong>${testStart}</strong> ${testRel} <strong>${testEnd}</strong>, which inverts the deduced order.`;

        deductionSection = `
            <div style="margin-top: 14px; padding: 12px 14px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--bracket-color, #334155); border-radius: 6px;">
                <div style="margin-bottom: 8px;">
                    <div style="color: #94a3b8; font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.05em;">Tested Conclusion</div>
                    <div style="font-size: 1.1em; margin-top: 2px;">${concHTML}</div>
                </div>
                <div style="margin-bottom: 8px;">
                    <div style="color: #94a3b8; font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Deduction Result</div>
                    <div>${evalBadge}</div>
                </div>
                <div style="color: #cbd5e1; font-size: 0.9em; line-height: 1.5; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 8px;">
                    ${reasonText}
                </div>
            </div>`;
    }

    return `
        <div class="logic-nback-explanation" style="text-align: left; font-family: monospace; max-width: 620px; line-height: 1.5;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--bracket-color, #334155); padding-bottom: 8px; margin-bottom: 12px;">
                <span style="font-weight: bold; color: #38bdf8; font-size: 1.05em;">Logic N-Back (N = ${n})</span>
                <span style="color: #94a3b8; font-size: 0.85em; font-family: monospace;">Stream Step ${step}</span>
            </div>

            <div style="margin-bottom: 12px;">
                <div style="color: #94a3b8; font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Active Working Memory Window (${question.activeCount || Math.max(0, chain.length - 1)} premises)</div>
                <ul style="margin: 0; padding-left: 20px; color: #e2e8f0; font-size: 0.95em;">
                    ${premisesList}
                </ul>
            </div>

            <div style="margin-bottom: 12px;">
                <div style="color: #94a3b8; font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Deduced Transitive Order (${relForwards})</div>
                <div style="padding: 8px 12px; background: rgba(0, 0, 0, 0.4); border: 1px solid var(--bracket-color, #334155); border-radius: 4px; overflow-x: auto; white-space: nowrap; font-size: 1.05em;">
                    ${chainDisplay}
                </div>
            </div>

            ${deductionSection}
        </div>`;
}

function createExplanation(question) {
    if (!question) return '';

    if (question.type === 'logic-nback') {
        return createLogicNBackExplanation(question);
    }

    if (question.type === 'infinite') {
        return createInfiniteExplanation(question);
    }

    if (question.type === 'uncertainty' && question.layouts) {
        return createUncertaintyExplanation(question);
    }

    if (question.type === 'advanced-rrt' || question.type === 'advanced-rrt-modal') {
        return createAdvancedRRTExplanation(question);
    }

    if (question.bucket) {
        return createExplanationBucket(question);
    }

    if (question.buckets) {
        return createExplanationBuckets(question);
    }

    if (question.wordCoordMap) {
        const grid = createGridFromMap(question.wordCoordMap);
        if (grid && Array.isArray(grid[0]) && Array.isArray(grid[0][0]) && Array.isArray(grid[0][0][0])) {
            return createExplanation4D(grid);
        } else if (grid && Array.isArray(grid[0]) && Array.isArray(grid[0][0])) {
            return createExplanation3D(grid);
        } else {
            return createExplanation2D(grid);
        }
    }

    if (question.subresults) {
        return question.subresults.map(createExplanation).join('<div class="binary-explainer-separator"></div>');
    }

    return '';
}

function createAdvancedRRTExplanation(question) {
    let contextHTML = '';

    if (question.headings && Object.keys(question.headings).length > 0) {
        const headingItems = Object.entries(question.headings)
            .map(([item, h]) => `<li><span style="color: #38bdf8;">${item}</span>: Facing <strong>${h.name}</strong></li>`)
            .join('');
        contextHTML += `
            <div style="margin-bottom: 10px; text-align: left;">
                <div style="color: #94a3b8; font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Orientations (Facing Space)</div>
                <ul style="margin: 0; padding-left: 20px;">${headingItems}</ul>
            </div>`;
    }

    if (question.swaps && question.swaps.length > 0) {
        const swapItems = question.swaps
            .map((s, idx) => `<li>Step ${idx + 1}: ⇄ <span style="color: #38bdf8;">${s.itemA}</span> swapped with <span style="color: #38bdf8;">${s.itemB}</span></li>`)
            .join('');
        contextHTML += `
            <div style="margin-bottom: 10px; text-align: left;">
                <div style="color: #94a3b8; font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Transformations Applied (Object Swap)</div>
                <ul style="margin: 0; padding-left: 20px;">${swapItems}</ul>
            </div>`;
    }

    if (question.baseLayout && Object.keys(question.baseLayout).length > 0) {
        const coordItems = Object.entries(question.baseLayout)
            .map(([item, coord]) => `<li><span style="color: #38bdf8;">${item}</span>: <code>[${Array.isArray(coord) ? coord.join(', ') : coord}]</code></li>`)
            .join('');
        contextHTML += `
            <div style="margin-bottom: 10px; text-align: left;">
                <div style="color: #94a3b8; font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Final Coordinates</div>
                <ul style="margin: 0; padding-left: 20px;">${coordItems}</ul>
            </div>`;
    }

    if (question.type === 'advanced-rrt-modal') {
        const layouts = question.layouts || [];
        const labels = { must: 'MUST BE', could: 'COULD OR COULD NOT BE', cannot: 'COULD NOT BE' };
        const labelColors = { must: '#4ade80', could: '#38bdf8', cannot: '#f87171' };
        const meaning = {
            must: 'The conclusion holds in all possible multi-dimensional layouts.',
            could: 'The conclusion holds in some layouts, but not all.',
            cannot: 'The conclusion does not hold in any possible layout.',
        };
        const ans = question.correctAnswer || 'must';
        const badgeColor = labelColors[ans] || '#38bdf8';
        return `<div class="uncertainty-explanation-summary" style="padding: 10px; font-family: monospace; text-align: left; max-width: 620px; line-height: 1.5;">
            ${contextHTML}
            <div style="margin-top: 10px; padding: 10px 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--bracket-color, #334155); border-radius: 6px;">
                <div style="font-size: 1.1em; margin-bottom: 6px;">${question.conclusion}</div>
                <div style="margin-bottom: 6px;">
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: rgba(255,255,255,0.08); color: ${badgeColor}; font-weight: bold; border: 1px solid ${badgeColor}40;">
                        ${labels[ans] || ans.toUpperCase()}
                    </span>
                </div>
                <p style="margin: 4px 0; color: #cbd5e1;">${question.matchingLayoutCount ?? 0} of ${layouts.length} feasible layouts satisfy the condition.</p>
                <p style="margin: 4px 0; color: #94a3b8; font-size: 0.9em;">${meaning[ans] || ''}</p>
            </div>
        </div>`;
    }

    if (question.analogyPairs) {
        const { itemA1, itemB1, itemA2, itemB2 } = question.analogyPairs;
        const d1 = question.delta1 ? `[${question.delta1.join(', ')}]` : '';
        const d2 = question.delta2 ? `[${question.delta2.join(', ')}]` : '';
        const match = question.isValid;
        const evalBadge = match
            ? `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: rgba(74, 222, 128, 0.15); color: #4ade80; font-weight: bold; border: 1px solid rgba(74, 222, 128, 0.3);">TRUE (VALID)</span>`
            : `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: rgba(248, 113, 113, 0.15); color: #f87171; font-weight: bold; border: 1px solid rgba(248, 113, 113, 0.3);">FALSE (INVALID)</span>`;

        return `<div class="advanced-rrt-explanation" style="padding: 10px; font-family: monospace; text-align: left; max-width: 620px; line-height: 1.5;">
            ${contextHTML}
            <div style="margin-top: 10px; padding: 10px 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--bracket-color, #334155); border-radius: 6px;">
                <p style="margin: 4px 0;"><strong>Analogy Vector Comparison (2nd Order):</strong></p>
                <p style="margin: 4px 0;">Pair 1 (<span style="color: #38bdf8;">${itemA1}</span> &rarr; <span style="color: #38bdf8;">${itemB1}</span>): &Delta; = <code>${d1}</code></p>
                <p style="margin: 4px 0;">Pair 2 (<span style="color: #38bdf8;">${itemA2}</span> &rarr; <span style="color: #38bdf8;">${itemB2}</span>): &Delta; = <code>${d2}</code></p>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
                    <strong>Evaluation:</strong> ${evalBadge} <span style="color: #94a3b8; font-size: 0.9em;">(${match ? 'Vectors match &mdash; relation is identical.' : 'Vectors differ &mdash; relation is different.'})</span>
                </div>
            </div>
        </div>`;
    }

    const sub = question.targetSubject || 'Subject';
    const ref = question.targetReference || 'Reference';
    const actVec = question.actualVector ? `[${question.actualVector.join(', ')}]` : '';
    const perspectiveNote = question.usedEgocentricConclusion
        ? `<p style="margin: 4px 0; color: #94a3b8;">Perspective Frame: Egocentric relative to <span style="color: #38bdf8;">${ref}</span> (facing <strong>${question.headings?.[ref]?.name || 'unknown'}</strong>)</p>`
        : '';
    const match = question.isValid;
    const evalBadge = match
        ? `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: rgba(74, 222, 128, 0.15); color: #4ade80; font-weight: bold; border: 1px solid rgba(74, 222, 128, 0.3);">TRUE (VALID)</span>`
        : `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: rgba(248, 113, 113, 0.15); color: #f87171; font-weight: bold; border: 1px solid rgba(248, 113, 113, 0.3);">FALSE (INVALID)</span>`;

    return `<div class="advanced-rrt-explanation" style="padding: 10px; font-family: monospace; text-align: left; max-width: 620px; line-height: 1.5;">
        ${contextHTML}
        <div style="margin-top: 10px; padding: 10px 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--bracket-color, #334155); border-radius: 6px;">
            <p style="margin: 4px 0;"><strong>Multi-Axis Cumulative Displacement:</strong></p>
            <p style="margin: 4px 0;"><span style="color: #38bdf8;">${sub}</span> relative to <span style="color: #38bdf8;">${ref}</span>: &Delta; = <code>${actVec}</code></p>
            ${perspectiveNote}
            <p style="margin: 4px 0;">Actual relation: <strong style="color: #38bdf8;">${question.actualDirName || 'Unknown'}</strong></p>
            <p style="margin: 4px 0;">Presented relation: <strong>${question.presentedDirName || 'Unknown'}</strong></p>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
                <strong>Evaluation:</strong> ${evalBadge} <span style="color: #94a3b8; font-size: 0.9em;">(${match ? 'Matches actual displacement vector.' : 'Displacement vector mismatch.'})</span>
            </div>
        </div>
    </div>`;
}

function createExplanationPopup(question, e, isClick = false) {
    if (document.querySelector('dialog.explanation-popup[open]')) {
        return;
    }

    if (isClick) {
        createUncertaintyExplanationPopup(question, e);
        return;
    }

    removeExplanationPopup(true);

    const popup = document.createElement("div");
    popup.className = "explanation-popup";
    popup.style.position = "fixed";
    popup.style.top = "50%";
    popup.style.left = "50%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.zIndex = "1000";
    popup.style.padding = "16px 20px";
    popup.style.backgroundColor = "var(--background-color)";
    popup.style.borderRadius = "8px";
    popup.style.border = "1px solid var(--bracket-color, #334155)";
    popup.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.8)";
    popup.style.width = "fit-content";
    popup.style.maxWidth = "94vw";
    popup.style.maxHeight = "90vh";
    popup.style.overflow = "auto";
    popup.style.textAlign = "left";
    popup.style.pointerEvents = "none";

    const content = document.createElement("div");
    content.className = "explanation-content";
    content.style.fontFamily = "monospace";
    content.innerHTML = createExplanation(question);
    popup.appendChild(content);

    document.body.appendChild(popup);
}

function createUncertaintyExplanationPopup(question, event) {
    removeExplanationPopup(true);
    const resume = (typeof pauseForExplanation === 'function') ? pauseForExplanation() : () => {};
    const trigger = event && event.currentTarget || document.activeElement;
    const popup = document.createElement('dialog');
    popup.className = 'explanation-popup uncertainty-explanation' + (question.type === 'infinite' ? ' infinite-explanation' : '');
    popup.setAttribute('aria-labelledby', 'uncertainty-explanation-title');
    
    // Close when clicking directly on the backdrop
    popup.addEventListener('click', (event) => {
        if (event.target === popup) {
            popup.close();
        }
    });

    let titleText = 'Explanation';
    if (question.type === 'infinite') {
        titleText = 'Infinite mode explanation';
    } else if (question.type && question.type.startsWith('advanced-rrt')) {
        titleText = 'Advanced RRT explanation';
    } else if (question.type === 'logic-nback') {
        titleText = 'Logic N-Back explanation';
    } else if (question.type === 'uncertainty') {
        titleText = 'Possible spatial layouts';
    } else if (question.category) {
        titleText = `${question.category} explanation`;
    }

    const header = document.createElement('div');
    header.className = 'uncertainty-explanation-header';
    const title = document.createElement('h2');
    title.id = 'uncertainty-explanation-title';
    title.textContent = titleText;
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'uncertainty-explanation-close';
    closeButton.textContent = 'Close';
    closeButton.setAttribute('autofocus', '');
    closeButton.addEventListener('click', () => popup.close());
    header.append(title, closeButton);

    const content = document.createElement('div');
    content.className = 'uncertainty-explanation-content';
    content.innerHTML = createExplanation(question);
    popup.append(header, content);
    popup.addEventListener('close', () => {
        popup.remove();
        resume();
        if (trigger && trigger.isConnected && typeof trigger.focus === 'function') {
            trigger.focus();
        }
    }, { once: true });
    document.body.appendChild(popup);
    popup.showModal();
}

function removeExplanationPopup(force = false) {
    for (const popup of document.querySelectorAll('.explanation-popup')) {
        if (popup.tagName === 'DIALOG' && !force) {
            continue;
        }
        if (popup.tagName === 'DIALOG' && popup.open) {
            popup.close();
        }
        popup.remove();
    }
}

function createExplanationButton(question) {
    if (!question || question.category === 'Syllogism') {
        return '';
    }

    if (
        question.type === 'logic-nback' ||
        question.type === 'advanced-rrt' ||
        question.type === 'advanced-rrt-modal' ||
        question.type === 'uncertainty' ||
        question.type === 'infinite' ||
        question.layouts ||
        question.witnesses ||
        question.wordCoordMap ||
        question.bucket ||
        question.buckets ||
        question.subresults ||
        question.analogyPairs ||
        question.actualVector
    ) {
        return `<button type="button" class="explanation-button">Explanation</button>`;
    }

    return '';
}
