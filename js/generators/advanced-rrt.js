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

function getAdvancedRRTDirections(mode) {
    switch (mode) {
        case 'spatial':
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

function formatAdvancedRRTAnalogyHTML(itemA1, itemB1, itemA2, itemB2, isSame = true) {
    const statement = isSame
        ? '<div class="analogy-statement">has the same relation as</div>'
        : '<div class="analogy-statement" style="color: red;">has a different relation from</div>';
    return `<span class="subject">${itemA1}</span> to <span class="subject">${itemB1}</span> ${statement} <span class="subject">${itemA2}</span> to <span class="subject">${itemB2}</span>`;
}

function createAdvancedRRTQuestion(length, settings = savedata) {
    const premiseOverride = settings?.overrideAdvancedRRTPremises;
    const premiseCount = Number.isFinite(Number(premiseOverride)) && Number(premiseOverride) >= 2
        ? Number(premiseOverride)
        : Math.max(3, length || 3);
    
    const mode = settings?.advancedRRTMode || 'spatial_temporal_vertical';
    const isAnalogyAllowed = settings?.advancedRRTAnalogy ?? true;
    const isModal = settings?.advancedRRTModal ?? false;
    const directions = getAdvancedRRTDirections(mode);
    const dimCount = directions[0].vector.length;

    // 1. Generate unique stimuli
    const words = typeof createStimuli === 'function' ? createStimuli(premiseCount + 1) : [];
    while (words.length < premiseCount + 1) {
        words.push(`Item ${words.length + 1}`);
    }

    // 2. Build baseline layout with non-backtracking walk
    let baseLayout, edges, premisesHTML;
    let targetSubject, targetReference, actualVector, actualDirName;

    for (let attempt = 0; attempt < 20; attempt++) {
        baseLayout = { [words[0]]: new Array(dimCount).fill(0) };
        edges = [];
        premisesHTML = [];
        let prevVec = null;

        for (let i = 0; i < premiseCount; i++) {
            const subject = words[i + 1];
            const reference = words[i];
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
            });
        }

        // Try standard end-to-end pair
        targetSubject = words[words.length - 1];
        targetReference = words[0];
        actualVector = baseLayout[targetSubject].map((v, a) => v - baseLayout[targetReference][a]);
        actualDirName = getDirectionFromVectorAdvanced(actualVector, mode);

        if (!actualDirName) {
            // Find distant pair with valid non-zero direction
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

        if (actualDirName) break;
    }

    if (!actualDirName) {
        actualDirName = directions[0].name;
    }

    // 3. Handle Modal vs Deterministic
    if (isModal) {
        // Create an uncertain edge at index 1 or 0
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
                    html: formatAdvancedRRTRelationHTML(edge.subject, allowedDirs[0].name, edge.reference, 'SOMETIMES')
                });
                if (forbiddenDirs.length > 0) {
                    premiseConstraints.push({
                        subject: edge.subject,
                        reference: edge.reference,
                        modality: 'NEVER',
                        directions: forbiddenDirs.slice(0, 3).map(d => d.name),
                        html: formatAdvancedRRTRelationHTML(edge.subject, forbiddenDirs[0].name, edge.reference, 'NEVER')
                    });
                }
            } else {
                premiseConstraints.push({
                    subject: edge.subject,
                    reference: edge.reference,
                    modality: 'ALWAYS',
                    directions: [edge.direction.name],
                    html: formatAdvancedRRTRelationHTML(edge.subject, edge.direction.name, edge.reference, 'ALWAYS')
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
            return layout;
        });

        // Evaluate across layouts
        const layoutVectors = feasibleLayouts.map(l => {
            const cA = l[targetSubject];
            const cB = l[targetReference];
            return cA.map((v, a) => v - cB[a]);
        });

        // Balance target conclusion across MUST, COULD, CANNOT
        const pickType = Math.random();
        let targetDirName;
        if (pickType < 0.33) {
            // Target a direction that holds in NO layout (CANNOT)
            const nowhere = directions.filter(d => !layoutVectors.some(v => getDirectionFromVectorAdvanced(v, mode) === d.name));
            if (nowhere.length > 0) {
                targetDirName = nowhere[Math.floor(Math.random() * nowhere.length)].name;
            } else {
                targetDirName = getDirectionFromVectorAdvanced(layoutVectors[0], mode) || directions[0].name;
            }
        } else {
            // Target a direction from one of the layouts (MUST or COULD)
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
            instructions: ADVANCED_RRT_MODAL_INSTRUCTIONS,
            premises: premiseConstraints.map(p => p.html),
            premiseConstraints,
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

    // Deterministic Mode (Direct or Analogy)
    const isAnalogy = isAnalogyAllowed && Math.random() < 0.5 && words.length >= 4;

    if (isAnalogy) {
        // Second-order relational analogy: A1:B1 :: A2:B2
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
            // Find matching pair
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
            // Different relation
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
        const statedSame = true; // "has the same relation as"
        const isValid = (statedSame === actualMatch);

        const concHTML = formatAdvancedRRTAnalogyHTML(itemA1, itemB1, itemA2, itemB2, statedSame);

        edges.forEach(e => {
            premisesHTML.push(formatAdvancedRRTRelationHTML(e.subject, e.direction.name, e.reference));
        });

        const countdown = Number(settings?.overrideAdvancedRRTTime);
        return {
            category: 'Advanced RRT (Vector Analogy)',
            type: 'advanced-rrt',
            instructions: ADVANCED_RRT_INSTRUCTIONS,
            premises: premisesHTML,
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

    // Direct Multi-Axis Transitive Conclusion
    edges.forEach(e => {
        premisesHTML.push(formatAdvancedRRTRelationHTML(e.subject, e.direction.name, e.reference));
    });

    const isTrue = Math.random() < 0.5;
    let presentedDirName = actualDirName;
    if (!isTrue) {
        const falseDirs = directions.filter(d => d.name !== actualDirName);
        presentedDirName = falseDirs.length > 0
            ? falseDirs[Math.floor(Math.random() * falseDirs.length)].name
            : directions[0].name;
    }

    const isValid = (presentedDirName === actualDirName);
    const concHTML = formatAdvancedRRTRelationHTML(targetSubject, presentedDirName, targetReference);

    const countdown = Number(settings?.overrideAdvancedRRTTime);
    return {
        category: `Advanced RRT (${mode.replace(/_/g, ' ')})`,
        type: 'advanced-rrt',
        instructions: ADVANCED_RRT_INSTRUCTIONS,
        premises: premisesHTML,
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
        ADVANCED_RRT_INSTRUCTIONS,
        ADVANCED_RRT_MODAL_INSTRUCTIONS,
        getAdvancedRRTDirections,
        getDirectionFromVectorAdvanced,
        createAdvancedRRTQuestion,
        createAdvancedRRTGenerator,
    };
}
