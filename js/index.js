// Get rid of all the PWA stuff
if ('serviceWorker' in navigator)
    navigator.serviceWorker.getRegistrations()
        .then(registrations => {
            if (registrations.length) for (let r of registrations) r.unregister();
        });

const feedbackWrong = document.querySelector(".feedback--wrong");
const feedbackMissed = document.querySelector(".feedback--missed");
const feedbackRight = document.querySelector(".feedback--right");
const trueButton = document.getElementById("true-button");
const falseButton = document.getElementById("false-button");

const correctlyAnsweredEl = document.querySelector(".correctly-answered");
const nextLevelEl = document.querySelector(".next-level");

const backgroundDiv = document.querySelector('.background-image');
let imageChanged = true;

const timerInput = document.querySelector("#timer-input");
const timerToggle = document.querySelector("#timer-toggle");
const timerBar = document.querySelector(".timer__bar");
const customTimeInfo = document.querySelector(".custom-time-info");
let timerToggled = false;
let timerTime = 30;
let timerCount = 30;
let timerInstance;
let timerRunning = false;
let processingAnswer = false;

const historyList = document.getElementById("history-list");
const historyButton = document.querySelector(`label.open[for="offcanvas-history"]`);
const historyCheckbox = document.getElementById("offcanvas-history");
const settingsButton = document.querySelector(`label.open[for="offcanvas-settings"]`);
const totalDisplay = document.getElementById("total-display");
const averageDisplay = document.getElementById("average-display");
const averageCorrectDisplay = document.getElementById("average-correct-display");
const percentCorrectDisplay = document.getElementById("percent-correct-display");

let carouselIndex = 0;
let currentConclusionIndex = 0;
let carouselEnabled = false;
let question;
const carousel = document.querySelector(".carousel");
const carouselDisplayLabelType = carousel.querySelector(".carousel_display_label_type");
const carouselDisplayLabelProgress = carousel.querySelector(".carousel_display_label_progress");
const carouselDisplayText = carousel.querySelector(".carousel_display_text");
const carouselBackButton = carousel.querySelector("#carousel-back");
const carouselNextButton = carousel.querySelector("#carousel-next");

const display = document.querySelector(".display-outer");
const displayLabelType = display.querySelector(".display_label_type");
const displayLabelLevel = display.querySelector(".display_label_level");;
const displayText = display.querySelector(".display_text");;

const liveStyles = document.getElementById('live-styles');
const gameArea = document.getElementById('game-area');
const spoilerArea = document.getElementById('spoiler-area');

const confirmationButtons = document.querySelector(".confirmation-buttons");
let imagePromise = Promise.resolve();

const keySettingMapInverse = Object.entries(keySettingMap)
    .reduce((a, b) => (a[b[1]] = b[0], a), {});

carouselBackButton.addEventListener("click", carouselBack);
carouselNextButton.addEventListener("click", carouselNext);

function isKeyNullable(key) {
    return key.endsWith("premises") || key.endsWith("time") || key.endsWith("optional");
}

function registerEventHandlers() {
    for (const key in keySettingMap) {
        const value = keySettingMap[key];
        const input = document.querySelector("#" + key);

        // Checkbox handler
        if (input.type === "checkbox") {
            const handleCheck = () => {
                savedata[value] = !!input.checked;
                refresh();
            };
            input.addEventListener("input", handleCheck);
            input.addEventListener("change", handleCheck);
        }

        // Number handler
        if (input.type === "number") {
            input.addEventListener("input", evt => {

                let num = input?.value;
                if (num === undefined || num === null || num === '')
                    num = null;
                if (input.min && +num < +input.min)
                    num = null;
                if (input.max && +num > +input.max)
                    num = null;

                if (num == null) {
                    if (isKeyNullable(key)) {
                        savedata[value] = null;
                    } else {
                        // Fix infinite loop on mobile when changing # of premises
                        return;
                    }
                } else {
                    savedata[value] = +num;
                }
                refresh();
            });
        }

        if (input.type === "select-one") {
            input.addEventListener("change", evt => {
                savedata[value] = input.value;
                refresh();
            })
        }
    }
}

function save() {
    if (typeof PROFILE_STORE !== 'undefined') {
        PROFILE_STORE.saveProfiles();
    }
    setLocalStorageObj(appStateKey, appState);
}

function appStateStartup() {
    const appStateObj = getLocalStorageObj(appStateKey);
    if (appStateObj) {
        Object.assign(appState, appStateObj);
        setLocalStorageObj(appStateKey, appState);
    }
}

function load() {
    appStateStartup();
    if (typeof PROFILE_STORE !== 'undefined') {
        PROFILE_STORE.startup();
    }

    renderHQL();
    renderFolders();
    populateSettings();
}

function populateSettings() {
    for (let key in savedata) {
        if (!(key in keySettingMapInverse)) continue;
        let value = savedata[key];
        let id = keySettingMapInverse[key];
        
        const input = document.querySelector("#" + id);
        if (input.type === "checkbox") {
            if (value === true || value === false) {
                input.checked = value;
            }
        }
        else if (input.type === "number") {
            if (!value && isKeyNullable(id)) {
                input.value = '';
            } else if (typeof value === "number") {
                input.value = +value;
            }
        }
        else if (input.type === "text") {
            input.value = value;
        } else if (input.type === "select-one") {
            input.value = value;
        }
    }

    populateLinearDropdown();
    populateProgressionDropdown();
    populateAppearanceSettings();

    timerInput.value = savedata.timer;
    timerTime = timerInput.value;
}

function refresh() {
    save();
    populateSettings();
    init();
}

function carouselInit() {
    carouselIndex = 0;
    renderCarousel();
}

function displayInit() {
    const q = renderJunkEmojis(question);
    const conclusions = q.conclusionsList || [{ text: q.conclusion, isValid: q.isValid }];
    const currentConc = conclusions[currentConclusionIndex];
    const currentConcText = renderJunkEmojis({ conclusion: currentConc.text }).conclusion;

    displayLabelType.textContent = q.category.split(":")[0];
    displayLabelLevel.textContent = (q.plen || q.premises.length) + "p";
    const easy = savedata.scrambleFactor < 12 ? ' (easy)' : '';

    const concHeader = conclusions.length > 1
        ? `CONCLUSION ${currentConclusionIndex + 1} OF ${conclusions.length}`
        : `Conclusion`;

    displayText.innerHTML = [
        `<div class="preamble">Premises${easy}</div>`,
        ...q.premises.map(p => `<div class="formatted-premise">${p}</div>`),
        ...((q.operations && q.operations.length > 0) ? ['<div class="transform-header">Transformations</div>'] : []),
        ...(q.operations ? q.operations.map(o => `<div class="formatted-operation">${o}</div>`) : []),
        `<div class="postamble">${concHeader}</div>`,
        `<div class="formatted-conclusion">${currentConcText}</div>`,
    ].join('');
    const isAnalogy = question?.tags?.includes('analogy');
    const isBinary = question.type === 'binary';
    if (savedata.minimalMode && question.type !== 'syllogism') {
        displayText.classList.add('minimal');
    } else {
        displayText.classList.remove('minimal');
    }

    if (savedata.widePremises && question.type !== 'syllogism') {
        displayText.classList.add('wide-premises');
        gameArea.classList.add('wide-premises');
    } else {
        displayText.classList.remove('wide-premises');
        gameArea.classList.remove('wide-premises');
    }

    if (isAnalogy || isBinary) {
        displayText.classList.add('complicated-conclusion');
    } else {
        displayText.classList.remove('complicated-conclusion');
    }

    if (q.premises.length > 12) {
        displayText.classList.add('big-question');
    } else {
        displayText.classList.remove('big-question');
    }

    imagePromise = imagePromise.then(() => updateCustomStyles());

    if (appState.darkMode) {
        document.body.classList.remove('light-mode');
    } else {
        document.body.classList.add('light-mode');
    }
}

function clearBackgroundImage() {
    const fileInput = document.getElementById('image-upload');
    fileInput.value = '';
    delete appState.backgroundImage;
    imageChanged = true;
    save();
    imagePromise = imagePromise.then(() => deleteImage(imageKey));
    imagePromise = imagePromise.then(() => updateCustomStyles());
}

function handleImageChange(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const base64String = event.target.result;
            appState.backgroundImage = imageKey;
            imagePromise = imagePromise.then(() => storeImage(imageKey, base64String));
            imageChanged = true;
            refresh();
        };
        reader.readAsDataURL(file);
    }
}

function populateAppearanceSettings() {
    document.getElementById('color-input').value = appState.darkMode ? appState.gameAreaColor : appState.gameAreaLightColor;
    document.getElementById('p-sfx').value = appState.sfx;
    document.getElementById('p-fast-ui').checked = appState.fastUi;
    document.getElementById('p-dark-mode').checked = appState.darkMode;
}

function populateProgressionDropdown() {
    const timeBumper = document.getElementById('time-bumper');
    const timeDropper = document.getElementById('time-dropper');
    const isAuto = savedata.autoProgressionChange === 'auto';

    timeBumper.style.display = isAuto ? 'none' : 'flex';
    timeDropper.style.display = isAuto ? 'none' : 'flex';
}


function handleColorChange(event) {
    const color = event.target.value;
    if (appState.darkMode) {
        appState.gameAreaColor = color;
    } else {
        appState.gameAreaLightColor = color;
    }
    refresh();
}

function handleSfxChange(event) {
    appState.sfx = event.target.value;
    refresh();
}

function handleFastUiChange(event) {
    appState.fastUi = event.target.checked;
    removeFastFeedback();
    refresh();
}

function handleDarkModeChange(event) {
    appState.darkMode = event.target.checked;
    refresh();
}

async function updateCustomStyles() {
    let styles = '';
    if (imageChanged) {
        if (appState.backgroundImage) {
            const base64String = await getImage(imageKey);
            if (base64String) {
                const [prefix, base64Data] = base64String.split(',');
                const mimeType = prefix.match(/data:(.*?);base64/)[1];
                const binary = atob(base64Data);
                const len = binary.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }

                const blob = new Blob([bytes], { type: mimeType });
                const objectURL = URL.createObjectURL(blob);

                backgroundDiv.style.backgroundImage = `url(${objectURL})`;
            }
        } else {
            backgroundDiv.style.backgroundImage = ``;
        }
        imageChanged = false;
    }
    if (liveStyles.innerHTML !== styles) {
        liveStyles.innerHTML = styles;
    }

    const gameAreaColor = appState.darkMode ? appState.gameAreaColor : appState.gameAreaLightColor;
    const gameAreaImage = `${gameAreaColor}`
    if (gameArea.style.background !== gameAreaImage) {
        gameArea.style.background = '';
        gameArea.style.background = gameAreaImage;
    }
}

function enableConfirmationButtons() {
    confirmationButtons.style.pointerEvents = "all";
    confirmationButtons.style.opacity = 1;
}

function disableConfirmationButtons() {
    confirmationButtons.style.pointerEvents = "none";
    confirmationButtons.style.opacity = 0;
}

function renderCarousel() {
    if (!savedata.enableCarouselMode) {
        display.classList.add("visible");
        carousel.classList.remove("visible");
        enableConfirmationButtons();
        return;
    }
    const q = renderJunkEmojis(question);
    const conclusions = q.conclusionsList || [{ text: q.conclusion, isValid: q.isValid }];
    const currentConc = conclusions[currentConclusionIndex];
    const currentConcText = renderJunkEmojis({ conclusion: currentConc.text }).conclusion;
    const carouselControls = carousel.querySelector(".carousel_controls");
    const h2 = carousel.querySelector(".carousel_display_label-wrapper h2");

    carousel.classList.add("visible");
    display.classList.remove("visible");
    if (carouselIndex == 0) {
        carouselBackButton.disabled = true;
    } else {
        carouselBackButton.disabled = false;
    }
    
    if (carouselIndex < q.premises.length) {
        if (carouselControls) carouselControls.style.display = "flex";
        carouselNextButton.disabled = false;
        disableConfirmationButtons();
        if (h2) {
            h2.style.padding = "";
            h2.style.justifyContent = "";
            h2.style.transform = "";
        }
        carouselDisplayLabelType.textContent = "Premise";
        carouselDisplayLabelType.style.fontSize = "";
        carouselDisplayLabelType.style.letterSpacing = "";
        carouselDisplayLabelProgress.style.fontSize = "";
        carouselDisplayLabelProgress.style.whiteSpace = "";
        carouselDisplayLabelProgress.textContent = (carouselIndex + 1) + "/" + q.premises.length;
        carouselDisplayText.innerHTML = q.premises[carouselIndex];
    } else if (q.operations && carouselIndex < q.operations.length + q.premises.length) {
        if (carouselControls) carouselControls.style.display = "flex";
        carouselNextButton.disabled = false;
        const operationIndex = carouselIndex - q.premises.length;
        disableConfirmationButtons();
        if (h2) {
            h2.style.padding = "";
            h2.style.justifyContent = "";
            h2.style.transform = "";
        }
        carouselDisplayLabelType.textContent = "Transformation";
        carouselDisplayLabelType.style.fontSize = "";
        carouselDisplayLabelType.style.letterSpacing = "";
        carouselDisplayLabelProgress.style.fontSize = "";
        carouselDisplayLabelProgress.style.whiteSpace = "";
        carouselDisplayLabelProgress.textContent = (operationIndex + 1) + "/" + q.operations.length;
        carouselDisplayText.innerHTML = q.operations[operationIndex];
    } else {
        if (carouselControls) carouselControls.style.display = "none";
        carouselNextButton.disabled = true;
        enableConfirmationButtons();
        if (h2) {
            h2.style.padding = "";
            h2.style.justifyContent = "";
            h2.style.transform = "";
        }
        carouselDisplayLabelType.textContent = "Conc";
        carouselDisplayLabelType.style.fontSize = "";
        carouselDisplayLabelType.style.letterSpacing = "";
        carouselDisplayLabelProgress.style.fontSize = "";
        carouselDisplayLabelProgress.style.whiteSpace = "";
        carouselDisplayLabelProgress.textContent = conclusions.length > 1 
            ? `${currentConclusionIndex + 1}/${conclusions.length}`
            : "";
        carouselDisplayText.innerHTML = currentConcText;
    }
}

function carouselBack() {
    carouselIndex--;
    renderCarousel();
}
  
function carouselNext() {
    carouselIndex++;
    renderCarousel();
}

function startCountDown() {
    timerRunning = true;
    if (question) {
        question.startedAt = new Date().getTime();
    }
    timerCount = findStartingTimerCount();
    animateTimerBar();
}

function stopCountDown() {
    timerRunning = false;
    timerCount = findStartingTimerCount();
    timerBar.style.width = '100%';
    clearTimeout(timerInstance);
}

function renderTimerBar() {
    const [mode, startingTimerCount] = findStartingTimerState();
    if (mode === 'override') {
        timerBar.classList.add('override');
        customTimeInfo.classList.add('visible');
        customTimeInfo.innerHTML =  '' + startingTimerCount + 's';
    } else {
        timerBar.classList.remove('override');
        customTimeInfo.classList.remove('visible');
        customTimeInfo.innerHTML = '';
    }
    timerBar.style.width = (timerCount / startingTimerCount * 100) + '%';
}

function animateTimerBar() {
    renderTimerBar();
    if (timerCount > 0) {
        timerCount--;
        timerInstance = setTimeout(animateTimerBar, 1000);
    }
    else {
        timeElapsed();
    }
}

function findStartingTimerCount() {
    const [_, count] = findStartingTimerState();
    return count;
}

function findStartingTimerState() {
    if (question) {
        if (question.countdown) {
            return ['override', Math.max(1, question.countdown)];
        } else if (question.timeOffset) {
            return ['override', Math.max(1, +timerTime + question.timeOffset)];
        }
    }
    return ['default', Math.max(1, +timerTime)];
}

function generateQuestion() {
    const analogyEnable = [
        savedata.enableDistinction,
        savedata.enableLinear,
        savedata.enableDirection,
        savedata.enableDirection3D,
        savedata.enableDirection4D,
        savedata.enableAnchorSpace
    ].reduce((a, c) => a + +c, 0) > 0;

    const binaryEnable = [
        savedata.enableDistinction,
        savedata.enableLinear,
        savedata.enableDirection,
        savedata.enableDirection3D,
        savedata.enableDirection4D,
        savedata.enableSyllogism
    ].reduce((a, c) => a + +c, 0) > 1;

    const generators = [];
    let quota = savedata.premises;
    quota = Math.max(2, quota);
    quota = Math.min(quota, maxStimuliAllowed());

    const banNormalModes = savedata.onlyAnalogy || savedata.onlyBinary;
    if (!banNormalModes) {
        if (savedata.enableDistinction)
            generators.push(createDistinctionGenerator(quota));
        if (savedata.enableLinear)
            generators.push(...createLinearGenerators(quota));
        if (savedata.enableSyllogism)
            generators.push(createSyllogismGenerator(quota));
        if (savedata.enableDirection)
            generators.push(createDirectionGenerator(quota));
        if (savedata.enableDirection3D)
            generators.push(createDirection3DGenerator(quota));
        if (savedata.enableDirection4D)
            generators.push(createDirection4DGenerator(quota));
        if (savedata.enableAnchorSpace)
            generators.push(createAnchorSpaceGenerator(quota));
    }
    if (
     savedata.enableAnalogy
     && !savedata.onlyBinary
     && analogyEnable
    ) {
        generators.push(createAnalogyGenerator(quota));
    }

    const binaryQuota = getPremisesFor('overrideBinaryPremises', quota);
    if (
     savedata.enableBinary
     && !savedata.onlyAnalogy
     && binaryEnable
    ) {
        if ((savedata.maxNestedBinaryDepth ?? 1) <= 1)
            generators.push(createBinaryGenerator(quota));
        else
            generators.push(createNestedBinaryGenerator(quota));
    }

    if (savedata.enableAnalogy && !analogyEnable) {
        alert('ANALOGY needs at least 1 other question class (SYLLOGISM and BINARY do not count).');
        if (savedata.onlyAnalogy)
            return;
    }

    if (savedata.enableBinary && !binaryEnable) {
        alert('BINARY needs at least 2 other question class (ANALOGY do not count).');
        if (savedata.onlyBinary)
            return;
    }
    if (generators.length === 0)
        return;

    const totalWeight = generators.reduce((sum, item) => sum + item.weight, 0);
    const randomValue = Math.random() * totalWeight;
    let cumulativeWeight = 0;
    let q;
    for (let generator of generators) {
        cumulativeWeight += generator.weight;
        if (randomValue < cumulativeWeight) {
            q = generator.question.create(generator.premiseCount);
            break;
        }
    }

    if (!savedata.removeNegationExplainer && /is-negated/.test(JSON.stringify(q)))
        q.premises.unshift('<span class="negation-explainer">Invert the <span class="is-negated">Red</span> text</span>');

    return q;
}

const RELATION_OPPOSITES = {
    "is same as": "is opposite of",
    "is opposite of": "is same as",
    "is opposite to": "is same as",
    "is equal to": "is not equal to",
    "is not equal to": "is equal to",
    "is greater than": "is smaller than",
    "is smaller than": "is greater than",
    "is faster than": "is slower than",
    "is slower than": "is faster than",
    "is North of": "is South of",
    "is South of": "is North of",
    "is East of": "is West of",
    "is West of": "is East of",
    "is North-West of": "is South-East of",
    "is South-East of": "is North-West of",
    "is North-East of": "is South-West of",
    "is South-West of": "is North-East of",
    "contains": "is within",
    "is within": "contains",
    "is above of": "is below of",
    "is below of": "is above of",
    "is Above of": "is Below of",
    "is Below of": "is Above of",
    "is above": "is below",
    "is below": "is above",
    "is Above": "is Below",
    "is Below": "is Above",
    "is left of": "is right of",
    "is right of": "is left of",
    "is Below and East of": "is Above and West of",
    "is Above and West of": "is Below and East of",
    "is Below and West of": "is Above and East of",
    "is Above and East of": "is Below and West of",
    "is Above and North of": "is Below and South of",
    "is Below and South of": "is Above and North of",
    "is Above and South of": "is Below and North of",
    "is Below and North of": "is Above and South of",
    "is Above and North-East of": "is Below and South-West of",
    "is Below and South-West of": "is Above and North-East of",
    "is Above and North-West of": "is Below and South-East of",
    "is Below and South-East of": "is Above and North-West of",
    "is Above and South-East of": "is Below and North-West of",
    "is Below and North-West of": "is Above and South-East of",
    "is Above and South-West of": "is Below and North-East of",
    "is Below and North-East of": "is Above and South-West of"
};

function stripHtml(str) {
    if (!str) return "";
    return str.replace(/<[^>]*>/g, "");
}

function formatEntity(entity) {
    if (!entity) return "";
    if (entity.includes("<b") || entity.includes("<span") || entity.includes("[JUNK]")) return entity;
    return `<b>${entity}</b>`;
}

function extractEntities(str) {
    if (!str || str.toLowerCase().includes("explainer")) return [];

    let clean = str;
    clean = clean.replace(/<svg[^>]*>[\s\S]*?#junk-(\d+)[\s\S]*?<\/svg>/gi, "[JUNK]$1[/JUNK]");
    clean = clean.replace(/<svg[^>]*id=["']junk-(\d+)["'][^>]*>[\s\S]*?<\/svg>/gi, "[JUNK]$1[/JUNK]");
    clean = clean.replace(/<svg[^>]*class=["'][^"']*junk[^"']*["'][^>]*>[\s\S]*?<\/svg>/gi, "[JUNK]$1[/JUNK]");
    clean = clean.replace(/#junk-(\d+)/gi, "[JUNK]$1[/JUNK]");
    clean = clean.replace(/\bjunk-(\d+)\b/gi, "[JUNK]$1[/JUNK]");

    const keywords = new Set([
        "is", "same", "as", "opposite", "of", "to", "equal", "not",
        "greater", "than", "smaller", "faster", "slower", "north", "south",
        "east", "west", "north-east", "south-east", "north-west", "south-west",
        "above", "below", "left", "right", "contains", "within", "at", "and",
        "or", "if", "then", "all", "no", "some", "are", "a", "an", "the",
        "true", "false", "junk"
    ]);

    const candidates = [];
    const occupied = [];
    const explicitPattern = /<b[^>]*>([\s\S]*?)<\/b>|\[JUNK\]\d+\[\/JUNK\]/gi;

    for (const match of clean.matchAll(explicitPattern)) {
        const value = stripHtml(match[1] || match[0]).trim();
        if (!value) continue;
        candidates.push({ index: match.index, value });
        occupied.push([match.index, match.index + match[0].length]);
    }

    const textWithSpaces = clean.replace(/<[^>]*>/g, tag => " ".repeat(tag.length));
    const tokenPattern = /\b[A-Za-z0-9_-]+\b/g;

    for (const match of textWithSpaces.matchAll(tokenPattern)) {
        const index = match.index;
        if (occupied.some(([start, finish]) => index >= start && index < finish)) continue;

        const value = match[0];
        const lower = value.toLowerCase();

        if (keywords.has(lower)) continue;
        if (/^\d+$/.test(value)) continue;
        if (lower.startsWith("junk")) continue;
        if (value.length < 2 && !/^[A-Z]$/.test(value)) continue;

        candidates.push({ index, value });
    }

    candidates.sort((a, b) => a.index - b.index);

    const entities = [];
    for (const candidate of candidates) {
        if (!entities.includes(candidate.value)) {
            entities.push(candidate.value);
        }
    }

    return entities;
}

function relationToVector(text) {
    const rel = stripHtml(text).toLowerCase().replace(/\s+/g, " ").trim();

    let x = 0;
    let y = 0;
    let z = 0;

    if (/\bnorth\b/.test(rel)) y = 1;
    if (/\bsouth\b/.test(rel)) y = -1;
    if (/\beast\b/.test(rel)) x = 1;
    if (/\bwest\b/.test(rel)) x = -1;
    if (/\babove\b/.test(rel)) z = 1;
    if (/\bbelow\b/.test(rel)) z = -1;

    if (
        /\bright\b/.test(rel) ||
        /\bgreater\b/.test(rel) ||
        /\bfaster\b/.test(rel) ||
        /\bcontains\b/.test(rel)
    ) {
        x = 1;
    }

    if (
        /\bleft\b/.test(rel) ||
        /\bsmaller\b/.test(rel) ||
        /\bslower\b/.test(rel) ||
        /\bwithin\b/.test(rel)
    ) {
        x = -1;
    }

    if (x === 0 && y === 0 && z === 0) return null;

    return { x, y, z };
}

function solveSpatialGraph(premises, baseConclusion, question) {
    const rawPremises = premises || [];
    const allRaw = [...rawPremises, baseConclusion || ""];

    const entities = [];

    for (const strVal of allRaw) {
        for (const entity of extractEntities(strVal)) {
            if (!entities.includes(entity)) {
                entities.push(entity);
            }
        }
    }

    if (entities.length < 2) return null;

    const coords = new Map();
    const parity = new Map();

    for (const entity of entities) {
        coords.set(entity, null);
        parity.set(entity, undefined);
    }

    for (const premise of rawPremises) {
        const premiseEntities = extractEntities(premise);

        if (premiseEntities.length >= 2 && relationToVector(premise)) {
            coords.set(premiseEntities[0], { x: 0, y: 0, z: 0 });
            break;
        }
    }

    for (const premise of rawPremises) {
        const premiseEntities = extractEntities(premise);
        if (premiseEntities.length < 2) continue;

        const lower = stripHtml(premise).toLowerCase();

        if (
            lower.includes("is same as") ||
            lower.includes("is equal to") ||
            lower.includes("is opposite") ||
            lower.includes("is not equal to")
        ) {
            parity.set(premiseEntities[0], 0);
            break;
        }
    }

    let changed = true;
    let passes = 0;

    while (changed && passes < 30) {
        changed = false;
        passes++;

        for (const premise of rawPremises) {
            const premiseEntities = extractEntities(premise);
            if (premiseEntities.length < 2) continue;

            const e1 = premiseEntities[0];
            const e2 = premiseEntities[1];
            const premiseClean = stripHtml(premise);
            const lower = premiseClean.toLowerCase();
            const vector = relationToVector(premiseClean);

            if (vector) {
                const c1 = coords.get(e1);
                const c2 = coords.get(e2);

                if (c1 && !c2) {
                    coords.set(e2, {
                        x: c1.x - vector.x,
                        y: c1.y - vector.y,
                        z: c1.z - vector.z
                    });
                    changed = true;
                } else if (!c1 && c2) {
                    coords.set(e1, {
                        x: c2.x + vector.x,
                        y: c2.y + vector.y,
                        z: c2.z + vector.z
                    });
                    changed = true;
                }
            }

            if (
                lower.includes("is same as") ||
                lower.includes("is equal to")
            ) {
                const p1 = parity.get(e1);
                const p2 = parity.get(e2);

                if (p1 !== undefined && p2 === undefined) {
                    parity.set(e2, p1);
                    changed = true;
                } else if (p2 !== undefined && p1 === undefined) {
                    parity.set(e1, p2);
                    changed = true;
                }
            } else if (
                lower.includes("is opposite") ||
                lower.includes("is not equal to")
            ) {
                const p1 = parity.get(e1);
                const p2 = parity.get(e2);

                if (p1 !== undefined && p2 === undefined) {
                    parity.set(e2, 1 - p1);
                    changed = true;
                } else if (p2 !== undefined && p1 === undefined) {
                    parity.set(e1, 1 - p2);
                    changed = true;
                }
            }
        }
    }

    return {
        entities,
        coords,
        evaluateRelation: (e1, e2, relation) => {
            const vector = relationToVector(relation);

            if (vector) {
                const c1 = coords.get(e1);
                const c2 = coords.get(e2);

                if (!c1 || !c2) return null;

                const sx = Math.sign(c1.x - c2.x);
                const sy = Math.sign(c1.y - c2.y);
                const sz = Math.sign(c1.z - c2.z);

                if (sx !== vector.x) return false;
                if (sy !== vector.y) return false;
                if (sz !== vector.z) return false;

                return true;
            }

            const relationClean = stripHtml(relation).toLowerCase();
            const p1 = parity.get(e1);
            const p2 = parity.get(e2);

            if (p1 !== undefined && p2 !== undefined) {
                if (
                    relationClean.includes("is same as") ||
                    relationClean.includes("is equal to")
                ) {
                    return p1 === p2;
                }

                if (
                    relationClean.includes("is opposite") ||
                    relationClean.includes("is not equal to")
                ) {
                    return p1 !== p2;
                }
            }

            return null;
        }
    };
}

function generateSyllogismConclusions(question, count) {
    const baseRaw = question.conclusion;
    const conclusions = [{ text: baseRaw, isValid: question.isValid }];
    if (count <= 1) return conclusions;

    const cleanText = stripHtml(baseRaw).trim();
    const ents = extractEntities(baseRaw);
    
    if (ents.length >= 2) {
        const S = formatEntity(ents[0]);
        const P = formatEntity(ents[ents.length - 1]);
        
        let contradictoryText = "";
        if (cleanText.startsWith("All ") && cleanText.includes(" are ")) {
            contradictoryText = `Some ${S} are not ${P}`;
        } else if (cleanText.startsWith("No ") && cleanText.includes(" are ")) {
            contradictoryText = `Some ${S} are ${P}`;
        } else if (cleanText.startsWith("Some ") && cleanText.includes(" are not ")) {
            contradictoryText = `All ${S} are ${P}`;
        } else if (cleanText.startsWith("Some ") && cleanText.includes(" are ")) {
            contradictoryText = `No ${S} are ${P}`;
        }

        if (contradictoryText) {
            conclusions.push({ text: contradictoryText, isValid: !question.isValid });
        }
    }

    return conclusions;
}

function generateAnalogyConclusions(question, count) {
    const baseRaw = question.conclusion;
    const conclusions = [{ text: baseRaw, isValid: question.isValid }];
    if (count <= 1) return conclusions;

    const ents = extractEntities(baseRaw);
    if (ents.length >= 4) {
        const [A, B, C, D] = ents.map(formatEntity);
        
        const symmetric = `${C} : ${D} :: ${A} : ${B}`;
        conclusions.push({ text: symmetric, isValid: question.isValid });
        
        if (question.isValid && conclusions.length < count) {
            const invalid = `${A} : ${B} :: ${D} : ${C}`;
            conclusions.push({ text: invalid, isValid: false });
        }
    }

    return conclusions;
}

function generateBinaryConclusions(question, count) {
    const baseRaw = question.conclusion;
    const conclusions = [{ text: baseRaw, isValid: question.isValid }];
    if (count <= 1) return conclusions;

    if (baseRaw.includes(" AND ")) {
        const parts = baseRaw.split(" AND ");
        if (parts.length === 2) {
            conclusions.push({ text: `${parts[1].trim()} AND ${parts[0].trim()}`, isValid: question.isValid });
        }
    } else if (baseRaw.includes(" OR ")) {
        const parts = baseRaw.split(" OR ");
        if (parts.length === 2) {
            conclusions.push({ text: `${parts[1].trim()} OR ${parts[0].trim()}`, isValid: question.isValid });
        }
    }

    return conclusions;
}

function generateUniqueConclusions(question, count) {
    if (!question || !question.conclusion) return [];

    if (question.type === 'syllogism') return generateSyllogismConclusions(question, count);
    if (question?.tags?.includes('analogy')) return generateAnalogyConclusions(question, count);
    if (question.type === 'binary') return generateBinaryConclusions(question, count);

    const conclusions = [];
    const seenTexts = new Set();

    const baseConcRaw = question.conclusion;
    const baseConcClean = stripHtml(baseConcRaw);
    const baseNormText = baseConcClean.trim().toLowerCase();

    conclusions.push({
        text: baseConcRaw,
        isValid: question.isValid
    });
    seenTexts.add(baseNormText);

    for (const p of question.premises || []) {
        seenTexts.add(stripHtml(p).trim().toLowerCase());
    }

    if (count <= 1) return conclusions;

    const harderCheckbox = document.querySelector("#enable-harder-conclusions");
    const isHarderEnabled = !!(savedata.enableHarderConclusions || (harderCheckbox && harderCheckbox.checked));

    const graph = solveSpatialGraph(question.premises, question.conclusion, question);

    const cleanPremises = (question.premises || []).map(p => stripHtml(p));
    const allPremisesText = cleanPremises.join(" ") + " " + baseConcClean;

    const entities = [];
    const allRaw = [...(question.premises || []), question.conclusion || ""];
    for (const s of allRaw) {
        for (const e of extractEntities(s)) {
            if (!entities.includes(e)) {
                entities.push(e);
            }
        }
    }

    const knownRelations = Object.keys(RELATION_OPPOSITES);
    const discoveredRelations = new Set();

    for (const rel of knownRelations) {
        if (allPremisesText.toLowerCase().includes(rel.toLowerCase())) {
            discoveredRelations.add(rel);
            if (RELATION_OPPOSITES[rel]) {
                discoveredRelations.add(RELATION_OPPOSITES[rel]);
            }
        }
    }

    if (discoveredRelations.size === 0) {
        discoveredRelations.add("is same as");
        discoveredRelations.add("is opposite of");
        discoveredRelations.add("is Below of");
        discoveredRelations.add("is Above of");
    }

    const relationsList = Array.from(discoveredRelations);
    const candidatePool = [];

    if (entities.length >= 2) {
        for (let i = 0; i < entities.length; i++) {
            for (let j = 0; j < entities.length; j++) {
                if (i === j) continue;

                const eA = entities[i];
                const eB = entities[j];

                let distance = 1;
                let dx = 0, dy = 0, dz = 0;

                if (graph && graph.coords) {
                    const cA = graph.coords.get(eA);
                    const cB = graph.coords.get(eB);
                    if (cA && cB) {
                        dx = cA.x - cB.x;
                        dy = cA.y - cB.y;
                        dz = cA.z - cB.z;
                        distance = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
                    }
                }

                for (const rel of relationsList) {
                    const candidateText = `${formatEntity(eA)} ${rel} ${formatEntity(eB)}`;
                    const candidateNorm = stripHtml(candidateText).trim().toLowerCase();

                    if (!seenTexts.has(candidateNorm)) {
                        let isValidCandidate = null;
                        if (graph && graph.evaluateRelation) {
                            isValidCandidate = graph.evaluateRelation(eA, eB, rel);
                        }

                        if (isValidCandidate !== null) {
                            candidatePool.push({
                                text: candidateText,
                                isValid: isValidCandidate,
                                distance: distance,
                                dx: dx,
                                dy: dy,
                                dz: dz,
                                eA: eA,
                                eB: eB
                            });
                        }
                    }
                }
            }
        }
    }

    for (let i = candidatePool.length - 1; i > 0; i--) {
        const r = Math.floor(Math.random() * (i + 1));
        [candidatePool[i], candidatePool[r]] = [candidatePool[r], candidatePool[i]];
    }

    const getPrimaryAxis = (c) => {
        const absX = Math.abs(c.dx);
        const absY = Math.abs(c.dy);
        const absZ = Math.abs(c.dz);
        if (absX >= absY && absX >= absZ) return 'X';
        if (absY >= absX && absY >= absZ) return 'Y';
        return 'Z';
    };

    const selectedPool = [];
    while (conclusions.length < count && candidatePool.length > 0) {
        const coveredAxes = new Set(selectedPool.map(getPrimaryAxis));
        const coveredPairs = new Set();
        selectedPool.forEach(s => {
            coveredPairs.add(`${s.eA}_${s.eB}`);
            coveredPairs.add(`${s.eB}_${s.eA}`);
        });

        let bestScore = -Infinity;
        let bestIndex = -1;

        for (let idx = 0; idx < candidatePool.length; idx++) {
            const c = candidatePool[idx];
            let score = isHarderEnabled ? c.distance : 1;

            const axis = getPrimaryAxis(c);
            const pairKey = `${c.eA}_${c.eB}`;

            if (!coveredAxes.has(axis)) score += 5.0;
            if (!coveredPairs.has(pairKey)) score += 2.0;

            if (score > bestScore) {
                bestScore = score;
                bestIndex = idx;
            }
        }

        if (bestIndex !== -1) {
            const chosen = candidatePool.splice(bestIndex, 1)[0];
            const norm = stripHtml(chosen.text).trim().toLowerCase();
            if (!seenTexts.has(norm)) {
                seenTexts.add(norm);
                conclusions.push({ text: chosen.text, isValid: chosen.isValid });
                selectedPool.push(chosen);
            }
        } else {
            break;
        }
    }

    const mutationSources = conclusions.slice();
    const relationEntries = Object.entries(RELATION_OPPOSITES)
        .sort((a, b) => b[0].length - a[0].length);

    for (const source of mutationSources) {
        if (conclusions.length >= count) break;

        for (const [relation, opposite] of relationEntries) {
            const escapedRelation = relation.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            const regex = new RegExp(escapedRelation, "i");

            if (!regex.test(source.text)) continue;

            const mutatedText = source.text.replace(regex, opposite);
            const mutatedEntities = extractEntities(mutatedText);
            const mutatedNorm = stripHtml(mutatedText)
                .trim()
                .toLowerCase();

            if (
                mutatedEntities.length >= 2 &&
                !seenTexts.has(mutatedNorm) &&
                graph &&
                graph.evaluateRelation
            ) {
                const mutatedValid = graph.evaluateRelation(
                    mutatedEntities[0],
                    mutatedEntities[1],
                    mutatedText
                );

                if (mutatedValid !== null) {
                    seenTexts.add(mutatedNorm);

                    conclusions.push({
                        text: mutatedText,
                        isValid: mutatedValid
                    });
                }
            }

            break;
        }
    }

    let fallbackAttempts = 0;

    while (
        conclusions.length < count &&
        fallbackAttempts < 100 &&
        relationsList.length > 0
    ) {
        fallbackAttempts++;

        if (
            entities.length < 2 ||
            !graph ||
            !graph.evaluateRelation
        ) {
            break;
        }

        const eA = entities[
            Math.floor(Math.random() * entities.length)
        ];

        let eB = entities[
            Math.floor(Math.random() * entities.length)
        ];

        while (eA === eB) {
            eB = entities[
                Math.floor(Math.random() * entities.length)
            ];
        }

        const relation = relationsList[
            Math.floor(Math.random() * relationsList.length)
        ];

        const candidateText =
            `${formatEntity(eA)} ${relation} ${formatEntity(eB)}`;

        const candidateNorm = stripHtml(candidateText)
            .trim()
            .toLowerCase();

        if (seenTexts.has(candidateNorm)) continue;

        const candidateValid = graph.evaluateRelation(
            eA,
            eB,
            relation
        );

        if (candidateValid === null) continue;

        seenTexts.add(candidateNorm);

        conclusions.push({
            text: candidateText,
            isValid: candidateValid
        });
    }

    return conclusions;
}

function init() {
    stopCountDown();
    question = generateQuestion();
    if (!question) {
        return;
    }

    currentConclusionIndex = 0;

    const multiCheckbox = document.querySelector("#enable-multiple-conclusions");
    const numInput = document.querySelector("#number-of-conclusions");

    const isMultiEnabled = !!(savedata.enableMultipleConclusions || (multiCheckbox && multiCheckbox.checked));
    const countVal = savedata.numberOfConclusions || (numInput ? parseInt(numInput.value, 10) : 3);

    const numConclusions = isMultiEnabled ? Math.max(1, countVal) : 1;

    question.conclusionsList = generateUniqueConclusions(question, numConclusions);

    stopCountDown();
    if (timerToggled) {
        startCountDown();
    } else {
        renderTimerBar();
    }

    carouselInit();
    displayInit();
    if (typeof PROGRESS_STORE !== 'undefined') {
        PROGRESS_STORE.renderCurrentProgress(question);
    }
    renderConclusionSpoiler();
}

function renderConclusionSpoiler() {
    if (savedata.spoilerConclusion) {
        spoilerArea.classList.add('spoiler');
    } else {
        spoilerArea.classList.remove('spoiler');
    }
}

const DEFAULT_SOUNDS = {
    success: { audio: new Audio('sounds/default/success.mp3'), time: 2000},
    failure: { audio: new Audio('sounds/default/failure.mp3'), time: 1400},
    missed: { audio: new Audio('sounds/default/missed.mp3'), time: 1400},
}

const ZEN_SOUNDS = {
    success: { audio: new Audio('sounds/zen/success.mp3'), time: 2000 },
    failure: { audio: new Audio('sounds/zen/failure.mp3'), time: 1400 },
    missed: { audio: new Audio('sounds/zen/missed.mp3'), time: 1400 },
}

function playSoundFor(sound, duration) {
    sound.currentTime = 0;
    sound.volume = 0.6;
    sound.play();

    setTimeout(() => {
        let fadeOut = setInterval(() => {
            if (sound.volume > 0.10) {
                sound.volume -= 0.10;
            } else {
                clearInterval(fadeOut);
                sound.pause();
                sound.currentTime = 0;
                sound.volume = 0.6;
            }
        }, 100);
    }, duration - 600);
}

function getCurrentSoundPack() {
    if (appState.sfx === 'sfx1') {
        return DEFAULT_SOUNDS;
    } else if (appState.sfx === 'sfx2') {
        return ZEN_SOUNDS;
    }
    return null;
}

function playSound(property) {
    const sounds = getCurrentSoundPack();
    if (sounds) {
        playSoundFor(sounds[property].audio, sounds[property].time);
    }
}

function removeFastFeedback() {
    gameArea.classList.remove('right');
    gameArea.classList.remove('wrong');
    gameArea.classList.remove('missed');
}

let fastFeedbackTimer = null;
function fastFeedback(cb, className) {
    if (fastFeedbackTimer) {
        clearTimeout(fastFeedbackTimer);
        fastFeedbackTimer = null;
    }
    removeFastFeedback();
    gameArea.classList.add(className);
    setTimeout(() => {
        cb();
        processingAnswer = false;
        fastFeedbackTimer = setTimeout(() => {
            removeFastFeedback();
        }, 1000);
    }, 350);
}

function wowFeedbackRight(cb) {
    playSound('success');
    if (appState.fastUi) {
        fastFeedback(cb, 'right');
    } else {
        feedbackRight.classList.add("active");
        setTimeout(() => {
            feedbackRight.classList.remove("active");
            cb();
            processingAnswer = false;
        }, 1000);
    }
}

function wowFeedbackWrong(cb) {
    playSound('failure');
    if (appState.fastUi) {
        fastFeedback(cb, 'wrong');
    } else {
        feedbackWrong.classList.add("active");
        setTimeout(() => {
            feedbackWrong.classList.remove("active");
            cb();
            processingAnswer = false;
        }, 1000);
    }
}

function wowFeedbackMissed(cb) {
    playSound('missed');
    if (appState.fastUi) {
        fastFeedback(cb, 'missed');
    } else {
        feedbackMissed.classList.add("active");
        setTimeout(() => {
            feedbackMissed.classList.remove("active");
            cb();
            processingAnswer = false;
        }, 1000);
    }
}

function wowFeedback() {
    if (question.correctness === 'right') {
        wowFeedbackRight(init);
    } else if (question.correctness === 'wrong') {
        wowFeedbackWrong(init);
    } else {
        wowFeedbackMissed(init);
    }
}

function storeQuestionAndSave() {
    appState.questions.push(question);
    if (timerToggle.checked) {
        PROGRESS_STORE.storeCompletedQuestion(question)
    }
    save();
}

function processConclusionAnswer(userAnswer) {
    if (processingAnswer) return;
    processingAnswer = true;

    const currentConc = question.conclusionsList[currentConclusionIndex];
    currentConc.answerUser = userAnswer;
    currentConc.isCorrect = (userAnswer === currentConc.isValid);

    const isCorrectStep = currentConc.isCorrect;
    const isLastStep = (currentConclusionIndex >= question.conclusionsList.length - 1);

    const onFeedbackFinished = () => {
        if (!isLastStep) {
            currentConclusionIndex++;
            processingAnswer = false;
            displayInit();
            renderCarousel();
        } else {
            const allCorrect = question.conclusionsList.every(c => c.isCorrect);
            question.allConclusionsCorrect = allCorrect;
            question.answerUser = question.conclusionsList[0]?.answerUser;

            if (allCorrect) {
                appState.score++;
                question.correctness = 'right';
            } else {
                appState.score--;
                question.correctness = 'wrong';
            }

            question.answeredAt = new Date().getTime();
            storeQuestionAndSave();
            renderHQL(true);
            init();
            processingAnswer = false;
        }
    };

    if (isCorrectStep) {
        wowFeedbackRight(onFeedbackFinished);
    } else {
        wowFeedbackWrong(onFeedbackFinished);
    }
}

function checkIfTrue() {
    trueButton.blur();
    processConclusionAnswer(true);
}

function checkIfFalse() {
    falseButton.blur();
    processConclusionAnswer(false);
}

function timeElapsed() {
    if (processingAnswer) {
        return;
    }
    processingAnswer = true;
    appState.score--;
    question.correctness = 'missed';
    question.answerUser = undefined;
    question.answeredAt = new Date().getTime();
    storeQuestionAndSave();
    renderHQL(true);
    wowFeedback();
}

function resetApp() {
    const confirmed = confirm("Are you sure?");
    if (confirmed) {
        localStorage.removeItem(oldSettingsKey);
        localStorage.removeItem(imageKey);
        localStorage.removeItem(profilesKey);
        localStorage.removeItem(selectedProfileKey);
        localStorage.removeItem(appStateKey);
        document.getElementById("reset-app").innerText = 'Resetting...';
        deleteDatabase("SyllDB").then(() => {
            window.location.reload();
        });
    }
}

function clearHistory() {
    const confirmed = confirm("Are you sure? (does not remove progress graph history)");
    if (confirmed) {
        appState.questions = [];
        appState.score = 0;
        save();
        renderHQL();
    }
}

function deleteQuestion(i, isRight) {
    appState.score += (isRight ? -1 : 1);
    appState.questions.splice(i, 1);
    save();
    renderHQL();
}

function renderHQL(didAddSingleQuestion=false) {
    if (didAddSingleQuestion) {
        const index = appState.questions.length - 1;
        const recentQuestion = appState.questions[index];
        const firstChild = historyList.firstElementChild;
        historyList.insertBefore(createHQLI(recentQuestion, index), firstChild);
    } else {
        historyList.innerHTML = "";

        const len = appState.questions.length;
        const reverseChronological = appState.questions.slice().reverse();

        reverseChronological
            .map((q, i) => {
                const el = createHQLI(q, len - i - 1);
                return el;
            })
            .forEach(el => historyList.appendChild(el));
    }

    updateAverage(appState.questions);
    correctlyAnsweredEl.innerText = appState.score;
    nextLevelEl.innerText = appState.questions.length;
}

function updateAverage(reverseChronological) {
    let questions = reverseChronological.filter(q => q.answeredAt && q.startedAt);
    let times = questions.map(q => (q.answeredAt - q.startedAt) / 1000);
    if (times.length == 0) {
        return;
    }
    const totalTime = times.reduce((a,b) => a + b, 0);
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    totalDisplay.innerHTML = minutes.toFixed(0) + 'm ' + seconds.toFixed(0) + 's';
    
    const average =  totalTime / times.length;
    averageDisplay.innerHTML = average.toFixed(1) + 's';

    const correctQuestions = questions.filter(q => q.correctness == 'right');
    const percentCorrect = 100 * correctQuestions.length / questions.length;
    percentCorrectDisplay.innerHTML = percentCorrect.toFixed(1) + '%';
    const correctTimes = correctQuestions.map(q => (q.answeredAt - q.startedAt) / 1000);
    if (correctTimes.length == 0) {
        averageCorrectDisplay.innerHTML = 'None yet';
        return;
    }
    const totalTimeBeingCorrect = correctTimes.reduce((a,b) => a + b, 0);
    const averageCorrect = totalTimeBeingCorrect / correctTimes.length;
    averageCorrectDisplay.innerHTML = averageCorrect.toFixed(1) + 's';
}

function createHQLI(question, i) {
    const q = renderJunkEmojis(question);
    const parent = document.createElement("DIV");

    let classModifier = {
        'missed': '',
        'right': 'hqli--right',
        'wrong': 'hqli--wrong'
    }[q.correctness];

    const htmlPremises = q.premises
        .map(p => `<div class="hqli-premise">${p}</div>`)
        .join("\n");

    const htmlOperations = q.operations ? q.operations.map(o => `<div class="hqli-operation">${o}</div>`).join("\n") : '';

    let responseTimeHtml = '';
    if (q.startedAt && q.answeredAt) {
        responseTimeHtml = `<div class="hqli-response-time">${Math.round((q.answeredAt - q.startedAt) / 1000)} sec</div>`;
    }

    const conclusions = q.conclusionsList || [{ text: q.conclusion, isValid: q.isValid, answerUser: q.answerUser, isCorrect: q.correctness === 'right' }];
    
    const conclusionsHtml = conclusions.map((c, idx) => {
        const cText = renderJunkEmojis({ conclusion: c.text }).conclusion;
        const cUserAns = c.answerUser !== undefined ? ('' + c.answerUser).toUpperCase() : '(TIMED OUT)';
        const cRightAns = ('' + c.isValid).toUpperCase();
        const cUserClass = c.isCorrect ? 'right' : 'wrong';
        const label = conclusions.length > 1 ? `Conclusion ${idx + 1}` : 'Conclusion';

        return `
            <div class="hqli-postamble">${label}</div>
            <div class="hqli-conclusion">${cText}</div>
            <div class="hqli-answer-user ${cUserClass}">${cUserAns}</div>
            <div class="hqli-answer ${c.isValid}">${cRightAns}</div>
        `;
    }).join('\n');

    const html =
`<div class="hqli ${classModifier}">
    <div class="inner">
        <div class="index"></div>
        <div class="hqli-premises">
            <div class="hqli-preamble">Premises</div>
            ${htmlPremises}
            ${htmlOperations ? '<div class="hqli-transform-header">Transformations</div>' : ''}
            ${htmlOperations}
        </div>
        ${conclusionsHtml}
        ${responseTimeHtml}
        <div class="hqli-footer">
            <div>${q.category}</div>
            ${createExplanationButton(q)}
            <button class="delete">X</button>
        </div>
    </div>
</div>`;
    parent.innerHTML = html;
    parent.querySelector(".index").textContent = i + 1;
    parent.querySelector(".delete").addEventListener('click', (e) => {
        e.stopPropagation();
        deleteQuestion(i, q.correctness === 'right');
    });
    const explanationButton = parent.querySelector(".explanation-button");
    if (explanationButton) {
        explanationButton.addEventListener('mouseenter', (e) => {
            createExplanationPopup(q, e);
        });
        explanationButton.addEventListener('mouseleave', () => {
            removeExplanationPopup();
        });
    }
    return parent.firstElementChild;
}

function toggleLegacyFolder() {
    appState.isLegacyOpen = !appState.isLegacyOpen;
    renderFolders();
    save();
}

function toggleExperimentalFolder() {
    appState.isExperimentalOpen = !appState.isExperimentalOpen;
    renderFolders();
    save();
}

function renderFolders() {
    renderFolder('legacy-folder-arrow', 'legacy-folder-content', appState.isLegacyOpen);
    renderFolder('experimental-folder-arrow', 'experimental-folder-content', appState.isExperimentalOpen);
}

function renderFolder(arrowId, contentId, isOpen) {
    const folderArrow = document.getElementById(arrowId);
    const folderContent = document.getElementById(contentId);
    if (isOpen) {
        folderContent.style.display = 'block';
        folderArrow.classList.add('open');
    } else {
        folderContent.style.display = 'none';
        folderArrow.classList.remove('open');
    }
}

// Events
timerInput.addEventListener("input", evt => {
    const el = evt.target;
    timerTime = el.value;
    timerCount = findStartingTimerCount();
    el.style.width = (el.value.length + 4) + 'ch';
    savedata.timer = el.value;
    if (timerToggle.checked) {
        stopCountDown();
        startCountDown();
    }
    save();
});

function handleCountDown() {
    timerToggled = timerToggle.checked;
    if (timerToggled)
        startCountDown();
    else
        stopCountDown();
}

timerToggle.addEventListener("click", evt => {
    handleCountDown();
});

let dehoverQueue = [];
function handleKeyPress(event) {
    const tagName = event.target.tagName.toLowerCase();
    const isEditable = event.target.isContentEditable;
    if (tagName === "button" || tagName === "input" || tagName === "textarea" || isEditable) {
        return;
    }
    switch (event.code) {
        case "KeyH":
            historyCheckbox.checked = !historyCheckbox.checked;
            if (historyCheckbox.checked) {
                const firstEntry = historyList.firstElementChild;
                if (firstEntry) {
                    const explanationButton = firstEntry.querySelector(`button.explanation-button`);
                    if (explanationButton) {
                        explanationButton.dispatchEvent(new Event("mouseenter"));
                        dehoverQueue.push(() => {
                            explanationButton.dispatchEvent(new Event("mouseleave"));
                        });
                    }
                }
            } else {
                dehoverQueue.forEach(callback => {
                    callback();
                });
            }
            break;
        case "KeyA":
            if (savedata.enableCarouselMode) {
                carouselBackButton.click();
            }
            break;
        case "KeyD":
            if (savedata.enableCarouselMode) {
                carouselNextButton.click();
            }
            break;
        case "KeyJ":
        case "Digit1":
            checkIfTrue();
            break;
        case "KeyK":
        case "Digit2":
            checkIfFalse();
            break;
        case "ArrowLeft":
            if (savedata.enableCarouselMode && !carouselNextButton.disabled) {
                carouselBackButton.click();
            } else {
                checkIfTrue();
            }
            break;
        case "ArrowRight":
            if (savedata.enableCarouselMode && !carouselNextButton.disabled) {
                carouselNextButton.click();
            } else {
                checkIfFalse();
            }
            break;
        case "Space":
            timerToggle.checked = !timerToggle.checked;
            handleCountDown();
            break;
        default:
            break;
    }
}

document.addEventListener("keydown", handleKeyPress);

registerEventHandlers();
load();
init();
