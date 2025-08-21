fetch("https://raw.githubusercontent.com/cancanakci/diHter/main/dihter.js")
    .then(res => res.text())
    .then(code => {
        const script = document.createElement("script");
        script.textContent = code;
        document.body.appendChild(script);
    })
    .catch(err => console.error("Failed to load script:", err));
(function () {
    const container = document.getElementById('wplaceBot');
    const header = document.getElementById('dragHeader');
    const previewImg = document.getElementById('previewImg');
    const previewImgPlaceholder = document.getElementById('previewImgPlaceholder');
    const fileInput = document.getElementById('imageInput');
    const wInput = document.getElementById('pxW');
    const hInput = document.getElementById('pxH');
    const pxCountInput = document.getElementById('pxCount');
    const totalTimeInput = document.getElementById('totalTimeInput');
    const startingPointInput = document.getElementById('startingPointInput');
    const startBtn = document.getElementById('startBtn');
    const clearBtn = document.getElementById('clearBtn');
    const advHeader = document.getElementById('advancedHeader');
    const advContent = document.getElementById('advancedContent');
    const advChev = document.getElementById('advancedChev');
    const advDitherAlgo = document.getElementById('ditherAlgorithm');
    const advGammaInput = document.getElementById('gammaInput');
    const advOrderedSizeInput = document.getElementById('orderedSizeInput');
    const advStrengthInput = document.getElementById('strengthInput');
    const advSerpentineInput = document.getElementById('serpentineInput');
    const lockAspectRatioInput = document.getElementById('lockAspectRatioInput');
    const copyConfigBtn = document.getElementById('copyConfig');
    const pasteConfigBtn = document.getElementById('pasteConfig');

    let aspectRatio = 0;
    let indicesArray = null;
    let isDragging = false, offsetX = 0, offsetY = 0, startX = 0, startY = 0;
    let originalImageUrl = null;
    let lastDitherTimeout = null;

    function loadConfig() {
        const config = getCurrentDrawingConfig();
        if (!config) {
            return false;
        }

        if (config.ditherDataUrl) {
            previewImg.src = config.ditherDataUrl;
            previewImg.style.display = "block";
            previewImgPlaceholder.style.display = "none";
        }
        if (config.ditherIndicesArray) {
            indicesArray = config.ditherIndicesArray;
        }
        if (config.height) {
            hInput.value = config.height;
        }
        if (config.width) {
            wInput.value = config.width;
        }
        if (config.width && config.height) {
            const pxCount = config.width * config.height;
            pxCountInput.value = pxCount;
            totalTimeInput.value = toTimeString(pxCount / 2);
            aspectRatio = config.width / config.height;
        }
        if (config.startPoint) {
            startingPointInput.value = `Chunk: { x: ${config.startPoint.tile.x}, y: ${config.startPoint.tile.y} }, Pixel: { x: ${config.startPoint.pixel.x}, y: ${config.startPoint.pixel.y} }`;
        }
        if (config.ditherAlgorithm) {
            advDitherAlgo.value = config.ditherAlgorithm;
        }
        if (config.shouldRunAtStart) {
            config.shouldRunAtStart = false;
            setCurrentDrawingConfig(config);
            // Start the bot first thing.
            callStartWplaceBot();
        }
        if (config.gamma) {
            advGammaInput.value = config.gamma;
        }
        if (config.orderedSize) {
            advOrderedSizeInput.value = config.orderedSize;
        }
        if (config.strength) {
            advStrengthInput.value = config.strength;
        }
        if (config.serpentine) {
            advSerpentineInput.value = config.serpentine;
        }

        return true;
    }

    function saveConfig() {
        const width = parseInt(wInput.value, 10);
        const height = parseInt(hInput.value, 10);
        const config = getCurrentDrawingConfig();
        config.width = width;
        config.height = height;
        config.ditherDataUrl = previewImg.src;
        config.ditherIndicesArray = indicesArray;
        config.ditherAlgorithm = advDitherAlgo.value;
        config.gamma = advGammaInput.value;
        config.orderedSize = advOrderedSizeInput.value;
        config.strength = advStrengthInput.value;
        config.serpentine = advSerpentineInput.value;
        setCurrentDrawingConfig(config);
    }

    loadConfig();

    function setCollapsed(v) {
        container.setAttribute('data-collapsed', String(v));
        document.getElementById('controlsRow').style.display = v ? 'none' : 'flex';
        document.getElementById('chev').style.transform = v ? 'rotate(-90deg)' : '';
    }

    header.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startY = e.clientY;
        isDragging = true;
        offsetX = e.clientX - container.offsetLeft;
        offsetY = e.clientY - container.offsetTop;
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
    });

    header.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
        offsetX = e.touches[0].clientX - container.offsetLeft;
        offsetY = e.touches[0].clientY - container.offsetTop;
        document.addEventListener('touchmove', dragTouch);
        document.addEventListener('touchend', stopDrag);
    });

    header.addEventListener('click', (e) => {
        const moved = Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5;
        if (!isDragging && !moved) {
            const isCollapsed = container.getAttribute('data-collapsed') === 'true';
            setCollapsed(!isCollapsed);
        }
    });

    function drag(e) {
        container.style.left = e.clientX - offsetX + 'px';
        container.style.top = e.clientY - offsetY + 'px';
    }
    function dragTouch(e) {
        container.style.left = e.touches[0].clientX - offsetX + 'px';
        container.style.top = e.touches[0].clientY - offsetY + 'px';
    }
    function stopDrag() {
        isDragging = false;
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', dragTouch);
        document.removeEventListener('touchend', stopDrag);
    }

    function validateInputs() {
        const w = parseInt(wInput.value, 10);
        const h = parseInt(hInput.value, 10);
        const isWidthValid = !isNaN(w) && w > 0;
        const isHeightValid = !isNaN(h) && h > 0;
        wInput.style.border = isWidthValid ? '1px solid #e6edf3' : '1px solid #ef4444';
        hInput.style.border = isHeightValid ? '1px solid #e6edf3' : '1px solid #ef4444';
        return isWidthValid && isHeightValid;
    }

    function toTimeString(totalMinutes) {
        var days = Math.floor(totalMinutes / 1440);
        var hours = Math.floor((totalMinutes % 1440) / 60);
        var minutes = totalMinutes % 60;
        if (hours < 10) { hours = "0" + hours; }
        if (minutes < 10) { minutes = "0" + minutes; }
        return days + " days " + hours + " hours " + minutes + " minutes";
    }

    async function performDither() {
        if (!originalImageUrl) {
            previewImg.src = '';
            previewImg.style.display = "none";
            previewImgPlaceholder.style.display = "block";
            container.style.border = '1px solid #e5e7eb';
            return;
        }

        if (!validateInputs()) {
            container.style.border = '1px solid #ef4444';
            return;
        }
        const w = parseInt(wInput.value, 10);
        const h = parseInt(hInput.value, 10);
        const pxCount = w * h;
        pxCountInput.value = pxCount;
        totalTimeInput.value = toTimeString(pxCount / 2);
        container.style.border = '1px solid #e5e7eb';
        try {
            const ditherResult = await ditherImageFromUrl(originalImageUrl, w, h, {
                paletteDefs: useDefaultColorsInput.checked ? null : getOwnedColors(),
                algorithm: advDitherAlgo.value,
                gamma: advGammaInput.value,
                strength: advStrengthInput.value,
                serpentine: advSerpentineInput.checked,
                orderedSize: parseInt(advOrderedSizeInput.value)
            });
            indicesArray = ditherResult.indicesArray;
            previewImg.src = ditherResult.dataUrl;
            previewImg.style.display = "block";
            previewImgPlaceholder.style.display = "none";

            saveConfig();
        } catch (error) {
            console.error('Dithering failed:', error);
            previewImg.src = originalImageUrl;
            if (originalImageUrl) {
                previewImg.style.display = "block";
                previewImgPlaceholder.style.display = "none";
            }
            alert('Failed to dither image.');
        }
    }

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
        originalImageUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            clearWplaceBotState();
            wInput.value = img.width;
            hInput.value = img.height;
            aspectRatio = img.width / img.height;
            performDither(img.width, img.height);
        };
        img.src = originalImageUrl;
    });

    function updateImageHeight(event) {
        if (!validateInputs()) {
            return;
        }
        if (lockAspectRatioInput.checked) {
            hInput.value = Math.round(event.target.value / aspectRatio);
        } else {
            aspectRatio = event.target.value / parseInt(hInput.value);
        }
    }
    function updateImageWidth(event) {
        if (!validateInputs()) {
            return;
        }
        if (lockAspectRatioInput.checked) {
            wInput.value = Math.round(event.target.value / aspectRatio);
        } else {
            aspectRatio = event.target.value / parseInt(hInput.value);
        }
    }

    wInput.addEventListener('input', (event) => { updateImageHeight(event); performDither() });
    hInput.addEventListener('input', (event) => { updateImageWidth(event); performDither(); });

    advDitherAlgo.addEventListener('input', performDither);
    advGammaInput.addEventListener('input', performDither);
    advStrengthInput.addEventListener('input', performDither);
    advOrderedSizeInput.addEventListener('input', performDither);
    advSerpentineInput.addEventListener('input', performDither);
    useDefaultColorsInput.addEventListener('input', performDither);

    wInput.addEventListener('change', updateImageHeight);
    hInput.addEventListener('change', updateImageWidth);

    function callStartWplaceBot() {
        if (validateInputs()) {
            wplaceBotState.running = !wplaceBotState.running;
            if (wplaceBotState.running) {
                const width = parseInt(wInput.value, 10);
                const height = parseInt(hInput.value, 10);

                saveConfig();
                startWplaceBot({ width, height }, indicesArray);
            }
            startBtn.textContent = wplaceBotState.running ? 'Stop' : 'Start';
        } else {
            console.error('Could not start the bot because inputs were invalid.');
        }
    }

    startBtn.addEventListener('click', callStartWplaceBot);

    function clearWplaceBotState() {
        setCurrentDrawingConfig({});
        wInput.value = "";
        hInput.value = "";
        previewImg.src = "";
        previewImg.style.display = "none";
        previewImgPlaceholder.style.display = "block";
        pxCountInput.value = "";
        totalTimeInput.value = "";
        startingPointInput.value = "";
    }

    clearBtn.addEventListener('click', clearWplaceBotState);

    // Advanced settings toggle
    advHeader.addEventListener('click', () => {
        const isHidden = advContent.style.display !== 'flex';
        advContent.style.display = isHidden ? 'flex' : 'none';
        advChev.style.transform = isHidden ? '' : 'rotate(-90deg)';
    });

    copyConfigBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(JSON.stringify(getCurrentDrawingConfig())).then(() => { });
    });
    pasteConfigBtn.addEventListener('click', () => {
        navigator.clipboard.readText().then((text) => {
            const oldConfig = getCurrentDrawingConfig();
            setCurrentDrawingConfig(JSON.parse(text));
            if (!loadConfig()) {
                setCurrentDrawingConfig(oldConfig);
            }
        });
    });

    function getOwnedColors() {
        const extraColorsBitmap = wplaceBotState.userInfo.extraColorsBitmap;
        const PREMIUM_COLORS_LOWER_BOUND = 32;

        return Object.keys(ALL_COLORS_BY_ID)
            .filter(id => id < PREMIUM_COLORS_LOWER_BOUND
                || (id >= PREMIUM_COLORS_LOWER_BOUND
                    && (extraColorsBitmap & (1 << (id - PREMIUM_COLORS_LOWER_BOUND))) !== 0))
            .map(id => ({ id: Number(id), ...ALL_COLORS_BY_ID[id] }));
    }
})();