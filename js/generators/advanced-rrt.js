// Unified Advanced Relational Reasoning (RRT) Generator
// Integrates 7D metric spaces, 2nd-order vector analogies (A:B :: C:D),
// and modal uncertainty superpositions (MUST / COULD / CANNOT) into Syllogimous v3.

const ADVANCED_RRT_SPATIAL = [
    { name: "North of", vector: [0, 1, 0, 0, 0, 0, 0] },
    { name: "South of", vector: [0, -1, 0, 0, 0, 0, 0] },
    { name: "East of", vector: [1, 0, 0, 0, 0, 0, 0] },
    { name: "West of", vector: [-1, 0, 0, 0, 0, 0, 0] },
    { name: "North-East of", vector: [1, 1, 0, 0, 0, 0, 0] },
    { name: "South-East of", vector: [1, -1, 0, 0, 0, 0, 0] },
    { name: "North-West of", vector: [-1, 1, 0, 0, 0, 0, 0] },
    { name: "South-West of", vector: [-1, -1, 0, 0, 0, 0, 0] }
];

const ADVANCED_RRT_VERTICAL = [
    { name: "Above", vector: [0, 0, 1, 0, 0, 0, 0] },
    { name: "Below", vector: [0, 0, -1, 0, 0, 0, 0] }
];

const ADVANCED_RRT_TEMPORAL = [
    { name: "After", vector: [0, 0, 0, 1, 0, 0, 0] },
    { name: "Before", vector: [0, 0, 0, -1, 0, 0, 0] }
];

const ADVANCED_RRT_COMPARISON = [
    { name: "Greater than", vector: [0, 0, 0, 0, 1, 0, 0] },
    { name: "Less than", vector: [0, 0, 0, 0, -1, 0, 0] }
];

const ADVANCED_RRT_HIERARCHY = [
    { name: "Hierarchically Above", vector: [0, 0, 0, 0, 0, 1, 0] },
    { name: "Hierarchically Below", vector: [0, 0, 0, 0, 0, -1, 0] }
];

const ADVANCED_RRT_DISTINCTION = [
    { name: "the Same as", vector: [0, 0, 0, 0, 0, 0, 0] },
    { name: "the Opposite of", vector: [0, 0, 0, 0, 0, 0, 1] }
];

const ADVANCED_RRT_SPATIAL_VERTICAL = (() => {
    const spatial = [
        ["North", [0, 1]], ["South", [0, -1]], ["East", [1, 0]], ["West", [-1, 0]],
        ["North-East", [1, 1]], ["South-East", [1, -1]], ["North-West", [-1, 1]], ["South-West", [-1, -1]]
    ];
    const vertical = [["Above", [1]], ["Below", [-1]]];
    const res = [];
    for (const [sName, sVec] of spatial) {
        for (const [vName, vVec] of vertical) {
            res.push({
                name: `${sName} of and ${vName}`,
                vector: [sVec[0], sVec[1], vVec[0], 0, 0, 0, 0]
            });
        }
    }
    for (const [sName, sVec] of spatial) {
        res.push({ name: `${sName} of`, vector: [sVec[0], sVec[1], 0, 0, 0, 0, 0] });
    }
    for (const [vName, vVec] of vertical) {
        res.push({ name: vName, vector: [0, 0, vVec[0], 0, 0, 0, 0] });
    }
    return res;
})();

const ADVANCED_RRT_SPATIAL_TEMPORAL = (() => {
    const spatial = [
        ["North", [0, 1]], ["South", [0, -1]], ["East", [1, 0]], ["West", [-1, 0]],
        ["North-East", [1, 1]], ["South-East", [1, -1]], ["North-West", [-1, 1]], ["South-West", [-1, -1]]
    ];
    const temporal = [["After", [1]], ["Before", [-1]]];
    const res = [];
    for (const [sName, sVec] of spatial) {
        for (const [tName, tVec] of temporal) {
            res.push({
                name: `${sName} of and ${tName}`,
                vector: [sVec[0], sVec[1], 0, tVec[0], 0, 0, 0]
            });
        }
    }
    for (const [sName, sVec] of spatial) {
        res.push({ name: `${sName} of`, vector: [sVec[0], sVec[1], 0, 0, 0, 0, 0] });
    }
    for (const [tName, tVec] of temporal) {
        res.push({ name: tName, vector: [0, 0, 0, tVec[0], 0, 0, 0] });
    }
    return res;
})();

const ADVANCED_RRT_SPATIAL_TEMPORAL_VERTICAL = (() => {
    const spatial = [
        ["North", [0, 1]], ["South", [0, -1]], ["East", [1, 0]], ["West", [-1, 0]],
        ["North-East", [1, 1]], ["South-East", [1, -1]], ["North-West", [-1, 1]], ["South-West", [-1, -1]]
    ];
    const temporal = [["After", [1]], ["Before", [-1]]];
    const vertical = [["Above", [1]], ["Below", [-1]]];
    const res = [];
    for (const [sName, sVec] of spatial) {
        for (const [tName, tVec] of temporal) {
            for (const [vName, vVec] of vertical) {
                res.push({
                    name: `${sName} of, ${vName}, and ${tName}`,
                    vector: [sVec[0], sVec[1], vVec[0], tVec[0], 0, 0, 0]
                });
            }
        }
    }
    res.push(...ADVANCED_RRT_SPATIAL_TEMPORAL);
    res.push(...ADVANCED_RRT_SPATIAL_VERTICAL);
    for (const [tName, tVec] of temporal) {
        for (const [vName, vVec] of vertical) {
            res.push({
                name: `${vName} and ${tName}`,
                vector: [0, 0, vVec[0], tVec[0], 0, 0, 0]
            });
        }
    }
    return res;
})();

const ADVANCED_RRT_FULL_7D = (() => {
    const res = [...ADVANCED_RRT_SPATIAL_TEMPORAL_VERTICAL];
    const relevance = [["More relevant than", [1]], ["Less relevant than", [-1]]];
    const hierarchy = [["Hierarchically Above", [1]], ["Hierarchically Below", [-1]]];
    const combined = [];
    for (const dir of res) {
        for (const [relName, relVec] of relevance) {
            const v = [...dir.vector];
            v[4] = relVec[0];
            combined.push({ name: `${dir.name} and ${relName}`, vector: v });
            for (const [hName, hVec] of hierarchy) {
                const v7 = [...v];
                v7[5] = hVec[0];
                combined.push({ name: `${dir.name}, ${relName}, and ${hName}`, vector: v7 });
            }
        }
    }
    for (const [relName, relVec] of relevance) {
        combined.push({ name: relName, vector: [0, 0, 0, 0, relVec[0], 0, 0] });
    }
    for (const [hName, hVec] of hierarchy) {
        combined.push({ name: hName, vector: [0, 0, 0, 0, 0, hVec[0], 0] });
    }
    return [...res, ...combined];
})();

const ADVANCED_RRT_INSTRUCTIONS = 'Premises establish multi-dimensional relationships across space, vertical plane, time, and scale. Analyze the transitive coordinate displacements or second-order relational analogies between the elements.';
const ADVANCED_RRT_MODAL_INSTRUCTIONS = 'Multi-dimensional premises contain incomplete or uncertain constraints. ALWAYS holds in all possible layouts; SOMETIMES in some but not all; NEVER in none. MUST BE = holds in all layouts; COULD OR COULD NOT BE = holds in some layouts; COULD NOT BE = holds in none.';

const ADVANCED_RRT_FACING_HEADINGS = [
    { name: "North", vector: [0, 1] },
    { name: "East", vector: [1, 0] },
    { name: "South", vector: [0, -1] },
    { name: "West", vector: [-1, 0] }
];

const ADVANCED_RRT_EGOCENTRIC_RELATIONS = [
    { name: "in front of", relVec: [0, 1] },
    { name: "behind", relVec: [0, -1] },
    { name: "to the right of", relVec: [1, 0] },
    { name: "to the left of", relVec: [-1, 0] },
    { name: "to the front-right of", relVec: [1, 1] },
    { name: "to the front-left of", relVec: [-1, 1] },
    { name: "to the back-right of", relVec: [1, -1] },
    { name: "to the back-left of", relVec: [-1, -1] }
];

const ADVANCED_RRT_CARDINAL_EGOCENTRIC = ADVANCED_RRT_EGOCENTRIC_RELATIONS.slice(0, 4);

function egocentricToGlobal2D(relVec, headingVec) {
    const [lx, ly] = relVec;
    const [hx, hy] = headingVec;
    const gx = lx * hy + ly * hx;
    const gy = -lx * hx + ly * hy;
    return [Math.sign(gx), Math.sign(gy)];
}

function globalToEgocentric2D(globalVec, headingVec) {
    const [gx, gy] = [Math.sign(globalVec[0]), Math.sign(globalVec[1])];
    const [hx, hy] = headingVec;
    const lx = gx * hy - gy * hx;
    const ly = gx * hx + gy * hy;
    const normLx = Math.sign(lx);
    const normLy = Math.sign(ly);
    for (const ego of ADVANCED_RRT_EGOCENTRIC_RELATIONS) {
        if (ego.relVec[0] === normLx && ego.relVec[1] === normLy) {
            return ego.name;
        }
    }
    return null;
}

function getAdvancedRRTDirections(mode) {
    switch (mode) {
        case 'spatial':
        case 'spatial_facing':
            return ADVANCED_RRT_SPATIAL;
        case 'spatial_vertical':
            return ADVANCED_RRT_SPATIAL_VERTICAL;
        case 'spatial_temporal':
            return ADVANCED_RRT_SPATIAL_TEMPORAL;
        case 'full_7d':
            return ADVANCED_RRT_FULL_7D;
        case 'spatial_temporal_vertical':
        default:
            return ADVANCED_RRT_SPATIAL_TEMPORAL_VERTICAL;
    }
}

function getDirectionFromVectorAdvanced(vec, mode) {
    const directions = getAdvancedRRTDirections(mode);
    if (!directions.length) return null;
    const targetLen = directions[0].vector.length;
    const normalized = vec.slice(0, targetLen).map((v, i) => {
        if (i === 6) return Math.abs(v % 2);
        return Math.sign(v);
    });
    for (const dir of directions) {
        if (dir.vector.length === normalized.length && dir.vector.every((val, idx) => val === normalized[idx])) {
            return dir.name;
        }
    }
    return null;
}

function formatAdvancedRRTRelationHTML(itemA, directionName, itemB, modality = null) {
    const modHTML = modality ? `<strong>${modality}</strong> ` : '';
    return `<span class="subject">${itemA}</span> <span class="relation">is ${modHTML}${directionName}</span> <span class="subject">${itemB}</span>`;
}

function formatAdvancedRRTFacingRelationHTML(itemA, egoName, itemB, refHeadingName, modality = null) {
    const modHTML = modality ? `<strong>${modality}</strong> ` : '';
    const headingBadge = `<span class="facing-badge">(facing ${refHeadingName})</span>`;
    return `<span class="subject">${itemA}</span> <span class="relation">is ${modHTML}${egoName}</span> <span class="subject">${itemB}</span> ${headingBadge}`;
}

function formatAdvancedRRTSwapHTML(itemA, itemB) {
    if (typeof savedata !== 'undefined' && savedata.minimalMode) {
        return `<span class="subject">${itemA}</span> <span class="swap-command">⇄</span> <span class="subject">${itemB}</span>`;
    }
    return `<span class="swap-command">⇄ Swap</span> <span class="subject">${itemA}</span> <span class="swap-with">with</span> <span class="subject">${itemB}</span>`;
}

function formatAdvancedRRTAnalogyHTML(itemA1, itemB1, itemA2, itemB2, isSame = true) {
    const statement = isSame
        ? '<div class="analogy-statement">has the same relation as</div>'
        : '<div class="analogy-statement" style="color: red;">has a different relation from</div>';
    return `<span class="subject">${itemA1}</span> to <span class="subject">${itemB1}</span> ${statement} <span class="subject">${itemA2}</span> to <span class="subject">${itemB2}</span>`;
}

function createAdvancedRRTQuestion(length, settings = (typeof savedata !== 'undefined' ? savedata : {})) {
    const premiseOverride = settings?.overrideAdvancedRRTPremises;
    const premiseCount = Number.isFinite(Number(premiseOverride)) && Number(premiseOverride) >= 2
        ? Number(premiseOverride)
        : Math.max(3, length || 3);
    
    const mode = settings?.advancedRRTMode || 'spatial_temporal_vertical';
    const isAnalogyAllowed = settings?.advancedRRTAnalogy ?? true;
    const isModal = settings?.advancedRRTModal ?? false;
    const isFacing = Boolean(settings?.advancedRRTFacing || mode === 'spatial_facing');
    const isSwap = Boolean(settings?.advancedRRTSwap);
    const swapCount = Math.max(1, Math.min(5, Number(settings?.advancedRRTSwapCount) || 1));

    const directions = getAdvancedRRTDirections(mode);
    const dimCount = directions[0].vector.length;

    // 1. Generate unique stimuli
    const words = typeof createStimuli === 'function' ? createStimuli(premiseCount + 1) : [];
    while (words.length < premiseCount + 1) {
        words.push(`Item ${words.length + 1}`);
    }

    // Assign initial headings if facing is active
    let headings = null;
    if (isFacing) {
        headings = {};
        for (const word of words) {
            headings[word] = ADVANCED_RRT_FACING_HEADINGS[Math.floor(Math.random() * ADVANCED_RRT_FACING_HEADINGS.length)];
        }
    }

    // 2. Build baseline layout with non-backtracking walk
    let baseLayout, edges;

    for (let attempt = 0; attempt < 30; attempt++) {
        baseLayout = { [words[0]]: new Array(dimCount).fill(0) };
        edges = [];
        let prevVec = null;

        for (let i = 0; i < premiseCount; i++) {
            const subject = words[i + 1];
            const reference = words[i];

            if (isFacing) {
                const refHeading = headings[reference];
                let candidates = ADVANCED_RRT_CARDINAL_EGOCENTRIC;
                if (prevVec) {
                    const nonInv = candidates.filter(c => {
                        const g2d = egocentricToGlobal2D(c.relVec, refHeading.vector);
                        return !(g2d[0] === -prevVec[0] && g2d[1] === -prevVec[1]);
                    });
                    if (nonInv.length > 0) candidates = nonInv;
                }
                const chosenEgo = candidates[Math.floor(Math.random() * candidates.length)];
                const g2d = egocentricToGlobal2D(chosenEgo.relVec, refHeading.vector);
                prevVec = [g2d[0], g2d[1], 0, 0, 0, 0, 0];

                const stepVec = new Array(dimCount).fill(0);
                stepVec[0] = g2d[0];
                stepVec[1] = g2d[1];

                let nonSpatialLabel = '';
                if (mode === 'spatial_vertical' || mode === 'spatial_temporal_vertical' || mode === 'full_7d') {
                    const vert = Math.random() < 0.5 ? 1 : -1;
                    stepVec[2] = vert;
                    nonSpatialLabel += vert === 1 ? ' and Above' : ' and Below';
                }
                if (mode === 'spatial_temporal' || mode === 'spatial_temporal_vertical' || mode === 'full_7d') {
                    const temp = Math.random() < 0.5 ? 1 : -1;
                    stepVec[3] = temp;
                    nonSpatialLabel += temp === 1 ? ' and After' : ' and Before';
                }

                const refCoord = baseLayout[reference];
                baseLayout[subject] = refCoord.map((val, axis) => val + stepVec[axis]);

                edges.push({
                    subject,
                    reference,
                    direction: {
                        name: `${chosenEgo.name}${nonSpatialLabel}`,
                        egoName: chosenEgo.name,
                        vector: stepVec,
                    },
                    refHeadingName: refHeading.name,
                    isFacing: true,
                });
            } else {
                let candidates = directions;
                if (prevVec) {
                    const nonInverse = directions.filter(d => !d.vector.every((val, idx) => val === -prevVec[idx]));
                    if (nonInverse.length > 0) candidates = nonInverse;
                }
                const chosenDir = candidates[Math.floor(Math.random() * candidates.length)];
                prevVec = chosenDir.vector;

                const refCoord = baseLayout[reference];
                const subCoord = refCoord.map((val, axis) => val + chosenDir.vector[axis]);
                baseLayout[subject] = subCoord;

                edges.push({
                    subject,
                    reference,
                    direction: chosenDir,
                    isFacing: false,
                });
            }
        }
        break;
    }

    // Format premises HTML from edges
    const premisesHTML = edges.map(e => {
        if (e.isFacing) {
            return formatAdvancedRRTFacingRelationHTML(e.subject, e.direction.name, e.reference, e.refHeadingName);
        }
        return formatAdvancedRRTRelationHTML(e.subject, e.direction.name, e.reference);
    });

    // 3. Apply Object Swaps if enabled
    const operations = [];
    const swaps = [];
    if (isSwap) {
        for (let s = 0; s < swapCount; s++) {
            let idxA = Math.floor(Math.random() * words.length);
            let idxB;
            do {
                idxB = Math.floor(Math.random() * words.length);
            } while (idxB === idxA);

            const itemA = words[idxA];
            const itemB = words[idxB];

            const tempCoord = baseLayout[itemA];
            baseLayout[itemA] = baseLayout[itemB];
            baseLayout[itemB] = tempCoord;

            if (headings) {
                const tempHeading = headings[itemA];
                headings[itemA] = headings[itemB];
                headings[itemB] = tempHeading;
            }

            swaps.push({ itemA, itemB });
            operations.push(formatAdvancedRRTSwapHTML(itemA, itemB));
        }
    }

    // Setup instructions
    let instructions = ADVANCED_RRT_INSTRUCTIONS;
    if (isModal) {
        instructions = ADVANCED_RRT_MODAL_INSTRUCTIONS;
    } else if (isFacing && isSwap) {
        instructions = 'Premises establish spatial positions with facing orientations. Track transformations (⇄ Swap) and perspective rotations in working memory to evaluate the conclusion.';
    } else if (isFacing) {
        instructions = 'Entities possess facing orientations (North, East, South, West). Mentally rotate perspectives (in front, behind, right, left) to deduce relative coordinates.';
    } else if (isSwap) {
        instructions = 'Premises establish multi-dimensional relationships. Mentally apply the dynamic entity permutations (⇄ Swap) to deduce the final relationship.';
    }

    // 4. Modal Uncertainty Branch
    if (isModal) {
        const uncertainIndex = Math.min(1, edges.length - 1);
        const allowedDirs = [
            edges[uncertainIndex].direction,
            ...directions.filter(d => d.name !== edges[uncertainIndex].direction.name).slice(0, 2)
        ];
        const forbiddenDirs = directions.filter(d => !allowedDirs.some(a => a.name === d.name));

        const premiseConstraints = [];
        edges.forEach((edge, idx) => {
            if (idx === uncertainIndex) {
                premiseConstraints.push({
                    subject: edge.subject,
                    reference: edge.reference,
                    modality: 'SOMETIMES',
                    directions: [allowedDirs[0].name],
                    html: edge.isFacing
                        ? formatAdvancedRRTFacingRelationHTML(edge.subject, allowedDirs[0].name, edge.reference, edge.refHeadingName, 'SOMETIMES')
                        : formatAdvancedRRTRelationHTML(edge.subject, allowedDirs[0].name, edge.reference, 'SOMETIMES')
                });
                if (forbiddenDirs.length > 0) {
                    premiseConstraints.push({
                        subject: edge.subject,
                        reference: edge.reference,
                        modality: 'NEVER',
                        directions: forbiddenDirs.slice(0, 3).map(d => d.name),
                        html: edge.isFacing
                            ? formatAdvancedRRTFacingRelationHTML(edge.subject, forbiddenDirs[0].name, edge.reference, edge.refHeadingName, 'NEVER')
                            : formatAdvancedRRTRelationHTML(edge.subject, forbiddenDirs[0].name, edge.reference, 'NEVER')
                    });
                }
            } else {
                premiseConstraints.push({
                    subject: edge.subject,
                    reference: edge.reference,
                    modality: 'ALWAYS',
                    directions: [edge.direction.name],
                    html: edge.isFacing
                        ? formatAdvancedRRTFacingRelationHTML(edge.subject, edge.direction.name, edge.reference, edge.refHeadingName, 'ALWAYS')
                        : formatAdvancedRRTRelationHTML(edge.subject, edge.direction.name, edge.reference, 'ALWAYS')
                });
            }
        });

        // Enumerate feasible layouts
        const feasibleLayouts = allowedDirs.map(uDir => {
            const layout = { [words[0]]: new Array(dimCount).fill(0) };
            edges.forEach((edge, idx) => {
                const dir = (idx === uncertainIndex) ? uDir : edge.direction;
                const ref = layout[edge.reference];
                layout[edge.subject] = ref.map((v, a) => v + dir.vector[a]);
            });
            // Apply swaps if active to this feasible layout
            if (isSwap) {
                swaps.forEach(({ itemA, itemB }) => {
                    const temp = layout[itemA];
                    layout[itemA] = layout[itemB];
                    layout[itemB] = temp;
                });
            }
            return layout;
        });

        let targetSubject = words[words.length - 1];
        let targetReference = words[0];

        // Evaluate across layouts
        const layoutVectors = feasibleLayouts.map(l => {
            const cA = l[targetSubject];
            const cB = l[targetReference];
            return cA.map((v, a) => v - cB[a]);
        });

        const pickType = Math.random();
        let targetDirName;
        if (pickType < 0.33) {
            const nowhere = directions.filter(d => !layoutVectors.some(v => getDirectionFromVectorAdvanced(v, mode) === d.name));
            if (nowhere.length > 0) {
                targetDirName = nowhere[Math.floor(Math.random() * nowhere.length)].name;
            } else {
                targetDirName = getDirectionFromVectorAdvanced(layoutVectors[0], mode) || directions[0].name;
            }
        } else {
            const available = layoutVectors
                .map(v => getDirectionFromVectorAdvanced(v, mode))
                .filter(Boolean);
            targetDirName = available.length > 0
                ? available[Math.floor(Math.random() * available.length)]
                : directions[0].name;
        }

        const holdsCount = layoutVectors.filter(v => getDirectionFromVectorAdvanced(v, mode) === targetDirName).length;
        
        let modalAnswer = 'could';
        if (holdsCount === feasibleLayouts.length) modalAnswer = 'must';
        else if (holdsCount === 0) modalAnswer = 'cannot';

        const concHTML = formatAdvancedRRTRelationHTML(targetSubject, targetDirName, targetReference);
        const countdown = Number(settings?.overrideAdvancedRRTTime);

        return {
            category: 'Advanced RRT (Modal 7D)',
            type: 'advanced-rrt-modal',
            instructions,
            premises: premiseConstraints.map(p => p.html),
            premiseConstraints,
            operations,
            swaps,
            headings,
            layouts: feasibleLayouts,
            layoutCount: feasibleLayouts.length,
            conclusion: concHTML,
            conclusionRelation: { subject: targetSubject, reference: targetReference, direction: targetDirName },
            correctAnswer: modalAnswer,
            matchingLayoutCount: holdsCount,
            conclusionsList: [{
                text: concHTML,
                correctAnswer: modalAnswer,
                matchingLayoutCount: holdsCount,
                isValid: modalAnswer === 'must'
            }],
            startedAt: Date.now(),
            plen: premiseCount,
            ...(Number.isFinite(countdown) && countdown > 0 && { countdown })
        };
    }

    // 5. Analogy Branch (Deterministic)
    const isAnalogy = isAnalogyAllowed && Math.random() < 0.5 && words.length >= 4;

    if (isAnalogy) {
        const getDelta = (itemA, itemB) => {
            const cA = baseLayout[itemA];
            const cB = baseLayout[itemB];
            return cA.map((v, a) => Math.sign(v - cB[a]));
        };

        const targetIsTrue = Math.random() < 0.5;
        const itemA1 = words[words.length - 1];
        const itemB1 = words[words.length - 2];
        const delta1 = getDelta(itemA1, itemB1);

        let itemA2, itemB2;
        if (targetIsTrue) {
            let found = false;
            for (let i = 0; i < words.length; i++) {
                for (let j = 0; j < words.length; j++) {
                    if (i === j) continue;
                    const wA = words[i], wB = words[j];
                    if ((wA === itemA1 && wB === itemB1) || (wA === itemB1 && wB === itemA1)) continue;
                    const d = getDelta(wA, wB);
                    if (d.some(v => v !== 0) && d.every((val, a) => val === delta1[a])) {
                        itemA2 = wA;
                        itemB2 = wB;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
            if (!found) {
                itemA2 = words[1];
                itemB2 = words[0];
            }
        } else {
            for (let i = 0; i < words.length; i++) {
                for (let j = 0; j < words.length; j++) {
                    if (i === j) continue;
                    const wA = words[i], wB = words[j];
                    if ((wA === itemA1 && wB === itemB1) || (wA === itemB1 && wB === itemA1)) continue;
                    const d = getDelta(wA, wB);
                    if (d.some(v => v !== 0) && !d.every((val, a) => val === delta1[a])) {
                        itemA2 = wA;
                        itemB2 = wB;
                        break;
                    }
                }
                if (itemA2) break;
            }
            if (!itemA2) {
                itemA2 = words[1];
                itemB2 = words[0];
            }
        }

        const delta2 = getDelta(itemA2, itemB2);
        const actualMatch = delta1.every((val, a) => val === delta2[a]);
        const statedSame = true;
        const isValid = (statedSame === actualMatch);

        const concHTML = formatAdvancedRRTAnalogyHTML(itemA1, itemB1, itemA2, itemB2, statedSame);
        const countdown = Number(settings?.overrideAdvancedRRTTime);

        return {
            category: isSwap ? 'Advanced RRT (Analogy + Swap)' : 'Advanced RRT (Vector Analogy)',
            type: 'advanced-rrt',
            instructions,
            premises: premisesHTML,
            operations,
            swaps,
            headings,
            conclusion: concHTML,
            isValid,
            correctAnswer: isValid,
            conclusionsList: [{
                text: concHTML,
                isValid,
                correctAnswer: isValid
            }],
            delta1,
            delta2,
            analogyPairs: { itemA1, itemB1, itemA2, itemB2 },
            baseLayout,
            startedAt: Date.now(),
            plen: premiseCount,
            ...(Number.isFinite(countdown) && countdown > 0 && { countdown })
        };
    }

    // 6. Direct Multi-Axis Transitive Conclusion
    let targetSubject = words[words.length - 1];
    let targetReference = words[0];
    let actualVector = baseLayout[targetSubject].map((v, a) => v - baseLayout[targetReference][a]);
    let actualDirName = getDirectionFromVectorAdvanced(actualVector, mode);

    if (!actualDirName) {
        for (let span = words.length - 1; span >= 1; span--) {
            for (let i = 0; i + span < words.length; i++) {
                const sub = words[i + span];
                const ref = words[i];
                const vec = baseLayout[sub].map((v, a) => v - baseLayout[ref][a]);
                const dir = getDirectionFromVectorAdvanced(vec, mode);
                if (dir) {
                    targetSubject = sub;
                    targetReference = ref;
                    actualVector = vec;
                    actualDirName = dir;
                    break;
                }
            }
            if (actualDirName) break;
        }
    }
    if (!actualDirName) {
        actualDirName = directions[0].name;
        actualVector = directions[0].vector;
    }

    const isTrue = Math.random() < 0.5;
    let presentedDirName;
    let concHTML;
    let isValid;

    let usedEgocentricConclusion = false;
    if (isFacing && headings && headings[targetReference]) {
        const refHeading = headings[targetReference];
        const actualEgoName = globalToEgocentric2D(actualVector, refHeading.vector);
        if (actualEgoName && (mode === 'spatial_facing' || Math.random() < 0.6)) {
            usedEgocentricConclusion = true;
            if (isTrue) {
                presentedDirName = actualEgoName;
                isValid = true;
            } else {
                const falseEgos = ADVANCED_RRT_EGOCENTRIC_RELATIONS.filter(e => e.name !== actualEgoName);
                presentedDirName = falseEgos[Math.floor(Math.random() * falseEgos.length)].name;
                isValid = false;
            }
            concHTML = formatAdvancedRRTFacingRelationHTML(targetSubject, presentedDirName, targetReference, refHeading.name);
        }
    }

    if (!usedEgocentricConclusion) {
        if (isTrue) {
            presentedDirName = actualDirName;
            isValid = true;
        } else {
            const falseDirs = directions.filter(d => d.name !== actualDirName);
            presentedDirName = falseDirs.length > 0
                ? falseDirs[Math.floor(Math.random() * falseDirs.length)].name
                : directions[0].name;
            isValid = false;
        }
        concHTML = formatAdvancedRRTRelationHTML(targetSubject, presentedDirName, targetReference);
    }

    let category;
    if (isFacing && isSwap) {
        category = 'Advanced RRT (Facing + Swap)';
    } else if (isFacing) {
        category = 'Advanced RRT (Facing Space)';
    } else if (isSwap) {
        category = 'Advanced RRT (Object Swap)';
    } else {
        category = `Advanced RRT (${mode.replace(/_/g, ' ')})`;
    }

    const countdown = Number(settings?.overrideAdvancedRRTTime);
    return {
        category,
        type: 'advanced-rrt',
        instructions,
        premises: premisesHTML,
        operations,
        swaps,
        headings,
        conclusion: concHTML,
        isValid,
        correctAnswer: isValid,
        conclusionsList: [{
            text: concHTML,
            isValid,
            correctAnswer: isValid
        }],
        baseLayout,
        targetSubject,
        targetReference,
        actualVector,
        presentedDirName,
        actualDirName,
        usedEgocentricConclusion,
        startedAt: Date.now(),
        plen: premiseCount,
        ...(Number.isFinite(countdown) && countdown > 0 && { countdown })
    };
}

class AdvancedRRTQuestion {
    create(length) {
        return createAdvancedRRTQuestion(length);
    }
}

function createAdvancedRRTGenerator(length) {
    return {
        question: new AdvancedRRTQuestion(),
        premiseCount: Math.max(3, length || 3),
        weight: typeof savedata !== 'undefined' && savedata.overrideAdvancedRRTWeight ? savedata.overrideAdvancedRRTWeight : 100,
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ADVANCED_RRT_SPATIAL,
        ADVANCED_RRT_VERTICAL,
        ADVANCED_RRT_TEMPORAL,
        ADVANCED_RRT_COMPARISON,
        ADVANCED_RRT_HIERARCHY,
        ADVANCED_RRT_DISTINCTION,
        ADVANCED_RRT_SPATIAL_VERTICAL,
        ADVANCED_RRT_SPATIAL_TEMPORAL,
        ADVANCED_RRT_SPATIAL_TEMPORAL_VERTICAL,
        ADVANCED_RRT_FULL_7D,
        ADVANCED_RRT_FACING_HEADINGS,
        ADVANCED_RRT_EGOCENTRIC_RELATIONS,
        ADVANCED_RRT_INSTRUCTIONS,
        ADVANCED_RRT_MODAL_INSTRUCTIONS,
        egocentricToGlobal2D,
        globalToEgocentric2D,
        getAdvancedRRTDirections,
        getDirectionFromVectorAdvanced,
        createAdvancedRRTQuestion,
        createAdvancedRRTGenerator,
    };
}
