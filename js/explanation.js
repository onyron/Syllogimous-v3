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

function createExplanation(question) {
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
}

function createAdvancedRRTExplanation(question) {
    if (question.type === 'advanced-rrt-modal') {
        const layouts = question.layouts || [];
        const labels = { must: 'MUST BE', could: 'COULD OR COULD NOT BE', cannot: 'COULD NOT BE' };
        const meaning = {
            must: 'The conclusion holds in all possible multi-dimensional layouts.',
            could: 'The conclusion holds in some layouts, but not all.',
            cannot: 'The conclusion does not hold in any possible layout.',
        };
        return `<div class="uncertainty-explanation-summary">
            <p>${question.conclusion}</p>
            <p><strong>${labels[question.correctAnswer] || ''}</strong></p>
            <p>${question.matchingLayoutCount} of ${layouts.length} feasible layouts satisfy the condition.</p>
            <p>${meaning[question.correctAnswer] || ''}</p>
        </div>`;
    }

    if (question.analogyPairs) {
        const { itemA1, itemB1, itemA2, itemB2 } = question.analogyPairs;
        const d1 = question.delta1 ? `[${question.delta1.join(', ')}]` : '';
        const d2 = question.delta2 ? `[${question.delta2.join(', ')}]` : '';
        const match = question.isValid;
        return `<div class="advanced-rrt-explanation" style="padding: 10px; font-family: monospace;">
            <p><strong>Analogy Vector Comparison (2nd Order):</strong></p>
            <p>Pair 1 (${itemA1} &rarr; ${itemB1}): &Delta; = <code>${d1}</code></p>
            <p>Pair 2 (${itemA2} &rarr; ${itemB2}): &Delta; = <code>${d2}</code></p>
            <p><strong>Result:</strong> ${match ? 'Vectors match &mdash; relation is identical.' : 'Vectors differ &mdash; relation is different.'}</p>
        </div>`;
    }

    const sub = question.targetSubject;
    const ref = question.targetReference;
    const actVec = question.actualVector ? `[${question.actualVector.join(', ')}]` : '';
    return `<div class="advanced-rrt-explanation" style="padding: 10px; font-family: monospace;">
        <p><strong>Multi-Axis Cumulative Displacement:</strong></p>
        <p>${sub} relative to ${ref}: &Delta; = <code>${actVec}</code></p>
        <p>Actual relation: <strong>${question.actualDirName || 'Unknown'}</strong></p>
        <p>Presented relation: <strong>${question.presentedDirName || 'Unknown'}</strong></p>
        <p><strong>Evaluation:</strong> ${question.isValid ? 'Correct (matches actual displacement).' : 'Incorrect (displacement mismatch).'}</p>
    </div>`;
}

function createExplanationPopup(question, e) {
    if (question.type === 'uncertainty' || question.type === 'infinite' || question.type === 'advanced-rrt-modal' || question.type === 'advanced-rrt') {
        createUncertaintyExplanationPopup(question, e);
        return;
    }

    const popup = document.createElement("div");
    popup.className = "explanation-popup";
    popup.style.position = "fixed";
    popup.style.top = "50%";
    popup.style.left = "50%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.zIndex = "1000";
    popup.style.padding = "20px";
    popup.style.backgroundColor = "var(--background-color)";
    popup.style.borderRadius = "8px";
    popup.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
    popup.style.width = "fit-content";
    popup.style.maxWidth = "98vw";
    popup.style.maxHeight = "98vh";
    popup.style.overflow = "hidden";
    popup.style.textAlign = "center";
    popup.style.pointerEvents = "none";

    const content = document.createElement("pre");
    content.innerHTML = createExplanation(question);
    popup.appendChild(content);

    document.body.appendChild(popup);
}

function createUncertaintyExplanationPopup(question, event) {
    removeExplanationPopup();
    const resume = pauseForExplanation();
    const trigger = event && event.currentTarget || document.activeElement;
    const popup = document.createElement('dialog');
    popup.className = 'explanation-popup uncertainty-explanation' + (question.type === 'infinite' ? ' infinite-explanation' : '');
    popup.setAttribute('aria-labelledby', 'uncertainty-explanation-title');
    // Keep the history sidebar open while interacting with its modal review.
    popup.addEventListener('click', event => event.stopPropagation());

    const header = document.createElement('div');
    header.className = 'uncertainty-explanation-header';
    const title = document.createElement('h2');
    title.id = 'uncertainty-explanation-title';
    title.textContent = question.type === 'infinite'
        ? 'Infinite mode explanation'
        : (question.type && question.type.startsWith('advanced-rrt') ? 'Advanced RRT explanation' : 'Possible spatial layouts');
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

function removeExplanationPopup() {
    for (const popup of document.querySelectorAll('.explanation-popup')) {
        if (popup.tagName === 'DIALOG' && popup.open) {
            popup.close();
        }
        popup.remove();
    }
}

function createExplanationButton(question) {
    if (question.category === 'Syllogism') {
        return '';
    }

    if (question.layouts || question.witnesses || question.wordCoordMap || question.bucket || question.buckets || question.subresults || question.analogyPairs || question.actualVector) {
        return `<button type="button" class="explanation-button">Explanation</button>`;
    }

    return ''
}
