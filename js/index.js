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

keySettingMap["enable-harder-conclusions"] = "enableHarderConclusions";
keySettingMap["enable-multiple-conclusions"] = "enableMultipleConclusions";
keySettingMap["number-of-conclusions"] = "numberOfConclusions";

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

        if (input.type === "checkbox") {
            const handleCheck = () => {
                savedata[value] = !!input.checked;
                refresh();
            };
            input.addEventListener("input", handleCheck);
            input.addEventListener("change", handleCheck);
        }

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
    const randomValue = randomUnit() * totalWeight;
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

const RELATION_INVERSES = {
    "is same as": "is same as",
    "is opposite of": "is opposite of",
    "is opposite to": "is opposite to",
    "is equal to": "is equal to",
    "is not equal to": "is not equal to",
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

function randomUnit() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const value = new Uint32Array(1);
        crypto.getRandomValues(value);
        return value[0] / 4294967296;
    }
    return Math.random();
}

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

    const rawOps = Array.isArray(question) ? question : (question?.operations || []);
    if (rawOps.length > 0) {
        for (const op of rawOps) {
            let clean = op;
            clean = clean.replace(/<svg[^>]*>[\s\S]*?#junk-(\d+)[\s\S]*?<\/svg>/gi, "[JUNK]$1[/JUNK]");
            clean = clean.replace(/<svg[^>]*id=["']junk-(\d+)["'][^>]*>[\s\S]*?<\/svg>/gi, "[JUNK]$1[/JUNK]");
            clean = clean.replace(/<svg[^>]*class=["'][^"']*junk[^"']*["'][^>]*>[\s\S]*?<\/svg>/gi, "[JUNK]$1[/JUNK]");
            clean = clean.replace(/#junk-(\d+)/gi, "[JUNK]$1[/JUNK]");
            clean = clean.replace(/\bjunk-(\d+)\b/gi, "[JUNK]$1[/JUNK]");
            clean = clean.replace(/<[^>]*>/g, " ");
            clean = clean.replace(/\s+/g, " ").trim();

            const findEnt = (txt) => {
                if (!txt) return null;
                const sorted = [...entities].sort((a, b) => b.length - a.length);
                const l = txt.toLowerCase();
                for (const e of sorted) {
                    if (txt.includes(e) || l.includes(e.toLowerCase())) return e;
                }
                return null;
            };

            const m1 = clean.match(/([xyz])\s+of\s+(.+?)\s+is\s+set\s+to\s+([xyz])\s+of\s+(.+)/i);
            if (m1) {
                const ax1 = m1[1].toLowerCase();
                const ent1 = findEnt(m1[2]);
                const ax2 = m1[3].toLowerCase();
                const ent2 = findEnt(m1[4]);
                if (ent1 && ent2) {
                    const c1 = coords.get(ent1);
                    const c2 = coords.get(ent2);
                    if (c1 && c2 && typeof c2[ax2] === 'number') {
                        c1[ax1] = c2[ax2];
                    }
                }
                continue;
            }

            const m2 = clean.match(/([xyz])\s+of\s+(.+?)\s+is\s+set\s+to\s+(-?\d+(?:\.\d+)?)/i);
            if (m2) {
                const ax1 = m2[1].toLowerCase();
                const ent1 = findEnt(m2[2]);
                const val = parseFloat(m2[3]);
                if (ent1) {
                    const c1 = coords.get(ent1);
                    if (c1 && !isNaN(val)) {
                        c1[ax1] = val;
                    }
                }
                continue;
            }

            const m3 = clean.match(/([xyz])\s+of\s+(.+?)\s+is\s+(increased|decreased|shifted)\s+by\s+(-?\d+(?:\.\d+)?)/i);
            if (m3) {
                const ax1 = m3[1].toLowerCase();
                const ent1 = findEnt(m3[2]);
                const dir = m3[3].toLowerCase();
                const val = parseFloat(m3[4]);
                const delta = dir === 'decreased' ? -val : val;
                if (ent1) {
                    const c1 = coords.get(ent1);
                    if (c1 && !isNaN(delta) && typeof c1[ax1] === 'number') {
                        c1[ax1] += delta;
                    }
                }
                continue;
            }

            const m4 = clean.match(/swap\s+([xyz])\s+and\s+([xyz])\s+of\s+(.+)/i);
            if (m4) {
                const ax1 = m4[1].toLowerCase();
                const ax2 = m4[2].toLowerCase();
                const ent1 = findEnt(m4[3]);
                if (ent1) {
                    const c1 = coords.get(ent1);
                    if (c1 && typeof c1[ax1] === 'number' && typeof c1[ax2] === 'number') {
                        const tmp = c1[ax1];
                        c1[ax1] = c1[ax2];
                        c1[ax2] = tmp;
                    }
                }
                continue;
            }

            const m5 = clean.match(/([xyz])\s+of\s+(.+?)\s+is\s+(?:inverted|negated)/i);
            if (m5) {
                const ax1 = m5[1].toLowerCase();
                const ent1 = findEnt(m5[2]);
                if (ent1) {
                    const c1 = coords.get(ent1);
                    if (c1 && typeof c1[ax1] === 'number') {
                        c1[ax1] = -c1[ax1];
                    }
                }
                continue;
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

function normalizeSemanticEntity(entity) {
    return stripHtml(entity || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function relationSemanticInfo(text) {
    const entities = extractEntities(text);
    if (entities.length < 2) return null;

    const eA = entities[0];
    const eB = entities[1];
    let a = normalizeSemanticEntity(eA);
    let b = normalizeSemanticEntity(eB);
    if (!a || !b || a === b) return null;

    const vector = relationToVector(text);
    const lower = stripHtml(text).toLowerCase().replace(/\s+/g, " ").trim();
    let kind;
    let value;

    if (vector) {
        kind = "vector";
        value = [vector.x, vector.y, vector.z];
    } else if (lower.includes("is same as") || lower.includes("is equal to")) {
        kind = "parity";
        value = 0;
    } else if (lower.includes("is opposite") || lower.includes("is not equal to")) {
        kind = "parity";
        value = 1;
    } else {
        return null;
    }

    if (a > b) {
        [a, b] = [b, a];
        if (kind === "vector") value = value.map(v => -v);
    }

    const pairKey = `${a}\u0001${b}`;
    const relationKey = kind === "vector" ? value.join(",") : String(value);

    return {
        eA,
        eB,
        pairKey,
        kind,
        value,
        semanticKey: `${kind}\u0001${pairKey}\u0001${relationKey}`
    };
}

function buildRelationTopology(premises) {
    const adjacency = new Map();
    const edgeKeys = new Set();
    const premiseSemanticKeys = new Set();

    const addNode = node => {
        if (!adjacency.has(node)) adjacency.set(node, new Set());
    };

    for (const premise of premises || []) {
        const info = relationSemanticInfo(premise);
        if (!info) continue;

        const a = normalizeSemanticEntity(info.eA);
        const b = normalizeSemanticEntity(info.eB);
        if (!a || !b || a === b) continue;

        addNode(a);
        addNode(b);
        adjacency.get(a).add(b);
        adjacency.get(b).add(a);
        edgeKeys.add(info.pairKey);
        premiseSemanticKeys.add(info.semanticKey);
    }

    return { adjacency, edgeKeys, premiseSemanticKeys };
}

function getRelationPath(topology, eA, eB) {
    const start = normalizeSemanticEntity(eA);
    const target = normalizeSemanticEntity(eB);
    if (!topology || !start || !target) return null;
    if (start === target) return { length: 0, edges: [] };
    if (!topology.adjacency.has(start) || !topology.adjacency.has(target)) return null;

    const queue = [start];
    const parent = new Map([[start, null]]);

    for (let i = 0; i < queue.length; i++) {
        const node = queue[i];
        if (node === target) break;

        for (const neighbor of topology.adjacency.get(node) || []) {
            if (parent.has(neighbor)) continue;
            parent.set(neighbor, node);
            queue.push(neighbor);
        }
    }

    if (!parent.has(target)) return null;

    const nodes = [];
    let current = target;
    while (current !== null) {
        nodes.push(current);
        current = parent.get(current);
    }
    nodes.reverse();

    const edges = [];
    for (let i = 0; i < nodes.length - 1; i++) {
        const a = nodes[i] < nodes[i + 1] ? nodes[i] : nodes[i + 1];
        const b = nodes[i] < nodes[i + 1] ? nodes[i + 1] : nodes[i];
        edges.push(`${a}\u0001${b}`);
    }

    return { length: edges.length, edges };
}

function pathBand(pathLength) {
    if (pathLength <= 1) return "direct";
    if (pathLength === 2) return "infer2";
    return "infer3";
}

function shuffleArray(items) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(randomUnit() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

function weightedPick(items, weightFn) {
    if (!items.length) return null;
    const weights = items.map(item => Math.max(0, weightFn(item)));
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return items[Math.floor(randomUnit() * items.length)];

    let value = randomUnit() * total;
    for (let i = 0; i < items.length; i++) {
        value -= weights[i];
        if (value <= 0) return items[i];
    }
    return items[items.length - 1];
}

function getActiveSpatialDimensions(premises) {
    const active = { x: false, y: false, z: false };
    for (const premise of premises || []) {
        const vector = relationToVector(premise);
        if (!vector) continue;
        if (vector.x !== 0) active.x = true;
        if (vector.y !== 0) active.y = true;
        if (vector.z !== 0) active.z = true;
    }
    return active;
}

function relationUsesInactiveDimension(relation, active) {
    const vector = relationToVector(relation);
    if (!vector) return false;
    if (vector.x !== 0 && !active.x) return true;
    if (vector.y !== 0 && !active.y) return true;
    if (vector.z !== 0 && !active.z) return true;
    return false;
}

function createConclusionCandidate(eA, eB, relation, text, graph, topology, isValid) {
    const semantic = relationSemanticInfo(text);
    if (!semantic) return null;

    const path = getRelationPath(topology, eA, eB);
    if (!path) return null;

    let dx = 0;
    let dy = 0;
    let dz = 0;
    let actualVector = null;

    if (graph && graph.coords) {
        const cA = graph.coords.get(eA);
        const cB = graph.coords.get(eB);
        if (cA && cB) {
            dx = cA.x - cB.x;
            dy = cA.y - cB.y;
            dz = cA.z - cB.z;
            actualVector = [Math.sign(dx), Math.sign(dy), Math.sign(dz)];
        }
    }

    const proposedVector = relationToVector(relation);
    let mismatchCount = null;
    let mismatchAxes = [];
    let relationComplexity = 0;
    let actualComplexity = 0;

    if (actualVector && proposedVector) {
        const proposed = [proposedVector.x, proposedVector.y, proposedVector.z];
        const axes = ["x", "y", "z"];
        mismatchAxes = axes.filter((_, i) => proposed[i] !== actualVector[i]);
        mismatchCount = mismatchAxes.length;
        relationComplexity = proposed.filter(v => v !== 0).length;
        actualComplexity = actualVector.filter(v => v !== 0).length;
    } else if (semantic.kind === "parity") {
        mismatchCount = isValid ? 0 : 1;
        relationComplexity = 1;
        actualComplexity = 1;
    }

    return {
        text,
        isValid,
        semantic,
        eA,
        eB,
        relation,
        pathLength: path.length,
        pathEdges: path.edges,
        band: pathBand(path.length),
        directlyStated: path.length === 1,
        premiseEquivalent: topology.premiseSemanticKeys.has(semantic.semanticKey),
        mismatchCount,
        mismatchAxes,
        relationComplexity,
        actualComplexity,
        coordSpan: Math.abs(dx) + Math.abs(dy) + Math.abs(dz)
    };
}

function buildPairGroups(candidates) {
    const groups = new Map();

    for (const candidate of candidates) {
        const key = candidate.semantic.pairKey;
        if (!groups.has(key)) {
            groups.set(key, {
                pairKey: key,
                eA: candidate.eA,
                eB: candidate.eB,
                pathLength: candidate.pathLength,
                pathEdges: candidate.pathEdges,
                band: candidate.band,
                directlyStated: candidate.directlyStated,
                candidates: []
            });
        }
        groups.get(key).candidates.push(candidate);
    }

    return Array.from(groups.values()).filter(group => {
        const hasTrue = group.candidates.some(c => c.isValid);
        const hasFalse = group.candidates.some(c => !c.isValid);
        return hasTrue && hasFalse;
    });
}

function chooseDirectTarget(count, groups) {
    const directCount = groups.filter(g => g.band === "direct").length;
    const indirectCount = groups.length - directCount;

    if (!directCount) return 0;
    if (!indirectCount) return Math.min(count, directCount);
    if (count <= 1) return randomUnit() < 0.5 ? 1 : 0;

    const minDirect = 1;
    const maxDirect = Math.min(count - 1, directCount);
    if (maxDirect < minDirect) return Math.min(count, directCount);

    const center = count * (0.35 + randomUnit() * 0.3);
    const options = [];
    for (let d = minDirect; d <= maxDirect; d++) options.push(d);

    return weightedPick(options, d => {
        const distance = Math.abs(d - center);
        return Math.exp(-distance * 0.85) + 0.15;
    });
}

function chooseStructuralPairs(groups, count, harderEnabled, topology) {
    if (!groups.length) return [];
    if (groups.length <= count) return shuffleArray(groups.slice());

    const targetDirect = harderEnabled ? chooseDirectTarget(count, groups) : null;
    const selected = [];
    const selectedKeys = new Set();
    const coveredEdges = new Set();
    const entityUse = new Map();
    let directSelected = 0;

    for (let slot = 0; slot < count; slot++) {
        const remaining = groups.filter(g => !selectedKeys.has(g.pairKey));
        if (!remaining.length) break;

        const slotsLeft = count - slot;
        const directNeeded = targetDirect === null ? null : Math.max(0, targetDirect - directSelected);
        let structuralPool = remaining;

        if (directNeeded !== null) {
            if (directNeeded >= slotsLeft) {
                const onlyDirect = remaining.filter(g => g.band === "direct");
                if (onlyDirect.length) structuralPool = onlyDirect;
            } else if (directNeeded === 0) {
                const onlyIndirect = remaining.filter(g => g.band !== "direct");
                if (onlyIndirect.length) structuralPool = onlyIndirect;
            } else {
                const wantsDirect = randomUnit() < directNeeded / slotsLeft;
                const preferred = remaining.filter(g => wantsDirect ? g.band === "direct" : g.band !== "direct");
                if (preferred.length) structuralPool = preferred;
            }
        }

        let targetBand = null;
        if (harderEnabled && structuralPool.some(g => g.band !== "direct")) {
            const bands = Array.from(new Set(structuralPool.map(g => g.band)));
            targetBand = weightedPick(bands, band => {
                if (band === "direct") return 0.35;
                if (band === "infer2") return 0.45;
                return 0.20;
            });
        }

        const scored = structuralPool.map(group => {
            const newEdges = group.pathEdges.filter(edge => !coveredEdges.has(edge)).length;
            const a = normalizeSemanticEntity(group.eA);
            const b = normalizeSemanticEntity(group.eB);
            const newEntities = +(entityUse.get(a) === undefined) + +(entityUse.get(b) === undefined);
            const reusePenalty = (entityUse.get(a) || 0) + (entityUse.get(b) || 0);
            let score = randomUnit() * 24;

            score += Math.min(newEdges, 2) * 14;
            score += Math.max(0, newEdges - 2) * 5;
            score += newEntities * 9;
            score -= reusePenalty * 5;

            if (harderEnabled) {
                if (targetBand && group.band === targetBand) score += 18;
                if (group.band === "direct") score += 4 + randomUnit() * 5;
                if (group.band === "infer2") score += 5 + randomUnit() * 6;
                if (group.band === "infer3") score += randomUnit() * 8;
                if (group.pathLength > 3) score -= (group.pathLength - 3) * 3;
            }

            return { group, score };
        });

        scored.sort((a, b) => b.score - a.score);
        const top = scored.slice(0, Math.min(5, scored.length));
        const chosenEntry = weightedPick(top, item => Math.exp(item.score / 16));
        const chosen = chosenEntry ? chosenEntry.group : scored[0].group;

        selected.push(chosen);
        selectedKeys.add(chosen.pairKey);
        if (chosen.band === "direct") directSelected++;
        for (const edge of chosen.pathEdges) coveredEdges.add(edge);
        const a = normalizeSemanticEntity(chosen.eA);
        const b = normalizeSemanticEntity(chosen.eB);
        entityUse.set(a, (entityUse.get(a) || 0) + 1);
        entityUse.set(b, (entityUse.get(b) || 0) + 1);
    }

    if (harderEnabled && topology && selected.length === count) {
        let improved = true;
        let passes = 0;

        while (improved && passes < 3) {
            improved = false;
            passes++;

            const currentCoverage = new Set(selected.flatMap(g => g.pathEdges)).size;
            const currentEntities = new Set(selected.flatMap(g => [normalizeSemanticEntity(g.eA), normalizeSemanticEntity(g.eB)])).size;

            for (let i = 0; i < selected.length && !improved; i++) {
                for (const replacement of groups) {
                    if (selectedKeys.has(replacement.pairKey)) continue;
                    const test = selected.slice();
                    test[i] = replacement;
                    if (targetDirect !== null && test.filter(g => g.band === "direct").length !== targetDirect) continue;

                    const edgeCoverage = new Set(test.flatMap(g => g.pathEdges)).size;
                    const entityCoverage = new Set(test.flatMap(g => [normalizeSemanticEntity(g.eA), normalizeSemanticEntity(g.eB)])).size;
                    const gain = (edgeCoverage - currentCoverage) * 3 + (entityCoverage - currentEntities);

                    if (gain > 0 && randomUnit() < 0.85) {
                        selectedKeys.delete(selected[i].pairKey);
                        selected[i] = replacement;
                        selectedKeys.add(replacement.pairKey);
                        improved = true;
                        break;
                    }
                }
            }
        }
    }

    return shuffleArray(selected);
}

function candidateRelationKey(candidate) {
    if (candidate.semantic.kind === "vector") return candidate.semantic.value.join(",");
    return `${candidate.semantic.kind}:${candidate.semantic.value}`;
}

function chooseCandidateForTruth(group, targetTruth, harderEnabled, usedRelationKeys) {
    let pool = group.candidates.filter(c => c.isValid === targetTruth);
    if (!pool.length) pool = group.candidates.slice();

    const scored = pool.map(candidate => {
        const relationKey = candidateRelationKey(candidate);
        const relationReuse = usedRelationKeys.get(relationKey) || 0;
        let score = randomUnit() * 14 - relationReuse * 8;

        if (harderEnabled && !candidate.isValid) {
            if (candidate.mismatchCount === 1) score += 30;
            else if (candidate.mismatchCount === 2) score += 8;
            else if (candidate.mismatchCount !== null) score -= 8;

            if (candidate.relationComplexity === candidate.actualComplexity) score += 20;
            else score -= Math.abs(candidate.relationComplexity - candidate.actualComplexity) * 8;
        }

        if (harderEnabled && candidate.isValid) {
            if (candidate.relationComplexity === candidate.actualComplexity) score += 8;
        }

        return { candidate, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, Math.min(4, scored.length));
    const chosenEntry = weightedPick(top, item => Math.exp(item.score / 14));
    return chosenEntry ? chosenEntry.candidate : scored[0].candidate;
}

function normalizePlainText(text) {
    return stripHtml(text).replace(/\s+/g, " ").trim().toLowerCase();
}

function presentCandidate(candidate, premiseTexts) {
    const forward = candidate.text;
    const inverseRelation = RELATION_INVERSES[candidate.relation];
    const reverse = inverseRelation
        ? `${formatEntity(candidate.eB)} ${inverseRelation} ${formatEntity(candidate.eA)}`
        : null;

    const options = [forward, reverse].filter(Boolean);
    const unique = [];
    const seen = new Set();

    for (const option of options) {
        const normalized = normalizePlainText(option);
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        unique.push(option);
    }

    const nonLiteral = unique.filter(option => !premiseTexts.has(normalizePlainText(option)));
    const available = nonLiteral.length ? nonLiteral : unique;
    const text = available[Math.floor(randomUnit() * available.length)] || forward;

    return {
        text,
        isValid: candidate.isValid,
        pathLength: candidate.pathLength,
        direct: candidate.pathLength === 1
    };
}

function generateUniqueConclusions(question, count) {
    if (!question || !question.conclusion) return [];

    if (question.type === 'syllogism') return generateSyllogismConclusions(question, count);
    if (question?.tags?.includes('analogy')) return generateAnalogyConclusions(question, count);
    if (question.type === 'binary') return generateBinaryConclusions(question, count);

    if (count <= 1) return [{ text: question.conclusion, isValid: question.isValid }];

    const harderCheckbox = document.querySelector("#enable-harder-conclusions");
    const isHarderEnabled = !!(savedata.enableHarderConclusions || (harderCheckbox && harderCheckbox.checked));
    const graph = solveSpatialGraph(question.premises, question.conclusion, question);
    if (!graph || !graph.evaluateRelation) return [{ text: question.conclusion, isValid: question.isValid }];

    const topology = buildRelationTopology(question.premises);
    const premises = question.premises || [];
    const premiseTexts = new Set(premises.map(normalizePlainText));
    const premisePlainText = premises.map(p => stripHtml(p)).join(" ").toLowerCase();
    const activeDimensions = getActiveSpatialDimensions(premises);

    const entities = [];
    for (const s of [...premises, question.conclusion || ""]) {
        for (const e of extractEntities(s)) {
            if (!entities.includes(e)) entities.push(e);
        }
    }

    const relationGroups = [
        ["is same as", "is opposite of", "is equal to", "is not equal to"],
        ["is greater than", "is smaller than"],
        ["is faster than", "is slower than"],
        ["contains", "is within"],
        ["is left of", "is right of"],
        [
            "is North of", "is South of", "is East of", "is West of",
            "is North-West of", "is South-East of", "is North-East of", "is South-West of",
            "is above", "is below", "is Above", "is Below",
            "is Below and East of", "is Above and West of", "is Below and West of", "is Above and East of",
            "is Above and North of", "is Below and South of", "is Above and South of", "is Below and North of",
            "is Above and North-East of", "is Below and South-West of", "is Above and North-West of", "is Below and South-East of",
            "is Above and South-East of", "is Below and North-West of", "is Above and South-West of", "is Below and North-East of"
        ]
    ];

    const activeRelations = new Set();
    for (const group of relationGroups) {
        if (group.some(rel => premisePlainText.includes(rel.toLowerCase()))) {
            for (const rel of group) {
                if (!relationUsesInactiveDimension(rel, activeDimensions)) activeRelations.add(rel);
            }
        }
    }

    if (activeRelations.size === 0) {
        const baseText = stripHtml(question.conclusion).toLowerCase();
        for (const group of relationGroups) {
            if (group.some(rel => baseText.includes(rel.toLowerCase()))) {
                for (const rel of group) activeRelations.add(rel);
            }
        }
    }

    const relationsList = Array.from(activeRelations);
    const candidatePool = [];
    const semanticKeys = new Set();

    const addCandidate = (eA, eB, relation, text, isValid) => {
        const candidate = createConclusionCandidate(
            eA,
            eB,
            relation,
            text,
            graph,
            topology,
            isValid
        );

        if (!candidate) return;
        if (semanticKeys.has(candidate.semantic.semanticKey)) return;
        semanticKeys.add(candidate.semantic.semanticKey);
        candidatePool.push(candidate);
    };

    for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
            const eA = entities[i];
            const eB = entities[j];

            for (const relation of relationsList) {
                const text = `${formatEntity(eA)} ${relation} ${formatEntity(eB)}`;
                const valid = graph.evaluateRelation(eA, eB, relation);
                if (valid === null) continue;
                addCandidate(eA, eB, relation, text, valid);
            }
        }
    }

    const pairGroups = buildPairGroups(candidatePool);
    if (!pairGroups.length) return [{ text: question.conclusion, isValid: question.isValid }];

    const uniquePairCount = pairGroups.length;
    const targetCount = Math.min(count, uniquePairCount);
    const selectedGroups = chooseStructuralPairs(pairGroups, targetCount, isHarderEnabled, topology);
    const truthTargets = Array.from({ length: selectedGroups.length }, () => randomUnit() < 0.5);
    const usedRelationKeys = new Map();
    const conclusions = [];

    for (let i = 0; i < selectedGroups.length; i++) {
        const candidate = chooseCandidateForTruth(
            selectedGroups[i],
            truthTargets[i],
            isHarderEnabled,
            usedRelationKeys
        );

        if (!candidate) continue;
        const relationKey = candidateRelationKey(candidate);
        usedRelationKeys.set(relationKey, (usedRelationKeys.get(relationKey) || 0) + 1);
        conclusions.push(presentCandidate(candidate, premiseTexts));
    }

    if (conclusions.length < count) {
        const usedSemantic = new Set(conclusions.map(c => relationSemanticInfo(c.text)?.semanticKey).filter(Boolean));
        const remaining = shuffleArray(candidatePool.filter(c => !usedSemantic.has(c.semantic.semanticKey)));

        for (const candidate of remaining) {
            if (conclusions.length >= count) break;
            const pairAlreadyUsed = conclusions.some(c => relationSemanticInfo(c.text)?.pairKey === candidate.semantic.pairKey);
            if (pairAlreadyUsed && conclusions.length < uniquePairCount) continue;
            const presented = presentCandidate(candidate, premiseTexts);
            const semantic = relationSemanticInfo(presented.text);
            if (!semantic || usedSemantic.has(semantic.semanticKey)) continue;
            usedSemantic.add(semantic.semanticKey);
            conclusions.push(presented);
        }
    }

    return shuffleArray(conclusions.slice(0, count));
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

    const originalConclusion = question.conclusion;
    const originalIsValid = question.isValid;
    question.conclusionsList = generateUniqueConclusions(question, numConclusions);

    if (question.conclusionsList.length > 1) {
        question.originalConclusion = originalConclusion;
        question.originalIsValid = originalIsValid;
        question.conclusion = question.conclusionsList[0].text;
        question.isValid = question.conclusionsList[0].isValid;
    }

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

    const isLastStep = currentConclusionIndex >= question.conclusionsList.length - 1;

    if (!isLastStep) {
        currentConclusionIndex++;
        processingAnswer = false;
        displayInit();
        renderCarousel();
        return;
    }

    const allCorrect = question.conclusionsList.every(c => c.isCorrect);
    const primaryConclusion = question.conclusionsList[0];
    question.allConclusionsCorrect = allCorrect;
    question.answerUser = primaryConclusion?.answerUser;

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

    if (allCorrect) {
        wowFeedbackRight(init);
    } else {
        wowFeedbackWrong(init);
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