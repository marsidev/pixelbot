const wplaceBotPopupInit = () => {
  const container = document.getElementById("wplaceBot");
  const dragHandle = document.getElementById("dragHandle");
  const minimizeBtn = document.getElementById("minimizeBtn");
  const previewImg = document.getElementById("previewImg");
  const previewImgPlaceholder = document.getElementById(
    "previewImgPlaceholder",
  );
  const fileInput = document.getElementById("imageInput");
  const wInput = document.getElementById("pxW");
  const hInput = document.getElementById("pxH");
  const pxCountInput = document.getElementById("pxCount");
  const startingPointInput = document.getElementById("startingPointInput");
  const startBtn = document.getElementById("startBtn");
  const clearBtn = document.getElementById("clearBtn");
  const advHeader = document.getElementById("advancedHeader");
  const advContent = document.getElementById("advancedContent");
  const advChev = document.getElementById("advancedChev");
  const advDitherAlgo = document.getElementById("ditherAlgorithm");
  const advGammaInput = document.getElementById("gammaInput");
  const advOrderedSizeInput = document.getElementById("orderedSizeInput");
  const advSerpentineInput = document.getElementById("serpentineInput");
  const lockAspectRatioInput = document.getElementById("lockAspectRatioInput");
  const copyConfigBtn = document.getElementById("copyConfig");
  const pasteConfigBtn = document.getElementById("pasteConfig");
  const autoStartCheckbox = document.getElementById("autoStartId");
  const clearStartingPoint = document.getElementById("clearStartingPoint");
  const setCurrentLocationBtn = document.getElementById("setCurrentLocation");
  const showOverlayInput = document.getElementById("showOverlayInput");
  const useDefaultColorsInput = document.getElementById(
    "useDefaultColorsInput",
  );
  const drawEdgesOnlyInput = document.getElementById("drawEdgesOnlyInput");
  const skipReprocessingInput = document.getElementById(
    "skipReprocessingInput",
  );
  const energyLimitInput = document.getElementById("energyLimitInput");

  // Color filter elements
  const colorFilterHeader = document.getElementById("colorFilterHeader");
  const colorFilterContent = document.getElementById("colorFilterContent");
  const colorFilterChev = document.getElementById("colorFilterChev");
  const colorFilterList = document.getElementById("colorFilterList");
  const enableAllColorsBtn = document.getElementById("enableAllColors");
  const disableAllColorsBtn = document.getElementById("disableAllColors");

  let aspectRatio = 0;
  let indicesArray = null;
  let colorPalette = {};
  let isDragging = false,
    offsetX = 0,
    offsetY = 0,
    animationFrame = null,
    currentX = 0,
    currentY = 0,
    targetX = 0,
    targetY = 0,
    initialRect = null;
  let originalImageUrl = null;

  function loadConfig() {
    const config = getCurrentDrawingConfig();
    if (!config) {
      return false;
    }

    if (config.startPoint?.tile && config.startPoint.pixel) {
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
    if (config.autoStart) {
      autoStartCheckbox.checked = config.autoStart;
      callStartWplaceBot();
    }
    if (config.gamma) {
      advGammaInput.value = config.gamma;
    }
    if (config.orderedSize) {
      advOrderedSizeInput.value = config.orderedSize;
    }
    if (config.serpentine) {
      advSerpentineInput.value = config.serpentine;
    }
    if (config.height) {
      hInput.value = config.height;
    }
    if (config.width) {
      wInput.value = config.width;
    }
    if (config.aspectRatio) {
      aspectRatio = config.aspectRatio;
    }
    if (config.useDefaultColorsOnly) {
      useDefaultColorsInput.checked = config.useDefaultColorsOnly;
    }
    // Default to showing overlay if not specified
    showOverlayInput.checked = config.showOverlay !== false;

    if (config.drawEdgesOnly) {
      drawEdgesOnlyInput.checked = config.drawEdgesOnly;
    }

    if (config.skipReprocessing) {
      skipReprocessingInput.checked = config.skipReprocessing;
    }

    // Load energy limit
    if (config.energyLimit !== undefined) {
      energyLimitInput.value = config.energyLimit;
    }

    // Load color filter settings
    if (config.colorFilter) {
      colorPalette = config.colorFilter;
    }

    if (config.width && config.height) {
      const pxCount = config.width * config.height;
      pxCountInput.value = pxCount;
      if (config.imageUrl) {
        originalImageUrl = config.imageUrl;
        if (wplaceBotState.userInfo) {
          performDither(wInput.value, hInput.height);
        }
      }
    }

    return true;
  }

  function saveConfig() {
    const width = parseInt(wInput.value, 10);
    const height = parseInt(hInput.value, 10);
    const config = getCurrentDrawingConfig();
    config.width = width;
    config.height = height;
    config.imageUrl = originalImageUrl;
    config.ditherAlgorithm = advDitherAlgo.value;
    config.gamma = advGammaInput.value;
    config.orderedSize = advOrderedSizeInput.value;
    config.serpentine = advSerpentineInput.value;
    config.aspectRatio = aspectRatio;
    config.useDefaultColorsOnly = useDefaultColorsInput.checked;
    config.showOverlay = showOverlayInput.checked;
    config.drawEdgesOnly = drawEdgesOnlyInput.checked;
    config.skipReprocessing = skipReprocessingInput.checked;
    config.energyLimit = parseInt(energyLimitInput.value, 10) || 0;
    config.colorFilter = colorPalette;
    setCurrentDrawingConfig(config);
  }

  loadConfig();

  // Initial validation check
  validateStartButton();

  window.addEventListener("wplace:userInfoReady", () => {
    // Re-dither the image.
    performDither(wInput.value, hInput.value);
  });

  window.addEventListener("wplace:currentTileAndPixel", (event) => {
    console.log("Received wplace:currentTileAndPixel event:", event.detail);
    const startPoint = event.detail;
    if (wplaceBotState.running) {
      console.log("Bot is running, ignoring tile/pixel selection");
      return;
    }
    if (startingPointInput.value === "") {
      console.log("Setting start point:", startPoint);
      // Save it to the config.
      const config = getCurrentDrawingConfig();
      config.startPoint = startPoint;
      setCurrentDrawingConfig(config);

      // Change start point
      startingPointInput.value = `Chunk: { x: ${startPoint.tile.x}, y: ${startPoint.tile.y} }, Pixel: { x: ${startPoint.pixel.x}, y: ${startPoint.pixel.y} }`;

      updateOverlay();
      validateStartButton();
    } else {
      console.log("Start point already set, ignoring new selection");
    }
  });

  function setCollapsed(v) {
    container.setAttribute("data-collapsed", String(v));
    const minimizeSvg = minimizeBtn.querySelector("svg path");
    if (minimizeSvg) {
      minimizeSvg.setAttribute("d", v ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6");
    }
  }

  // Blue Marble's smooth animation loop for optimal dragging performance
  const updatePosition = () => {
    if (isDragging) {
      // Only update DOM if position changed significantly (reduce repaints)
      const deltaX = Math.abs(currentX - targetX);
      const deltaY = Math.abs(currentY - targetY);

      if (deltaX > 0.5 || deltaY > 0.5) {
        currentX = targetX;
        currentY = targetY;

        // Use CSS transform for GPU acceleration
        container.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }

      animationFrame = requestAnimationFrame(updatePosition);
    }
  };

  const startDrag = (clientX, clientY) => {
    isDragging = true;
    initialRect = container.getBoundingClientRect();
    offsetX = clientX - initialRect.left;
    offsetY = clientY - initialRect.top;

    // Get current position from transform or use element position
    const computedStyle = window.getComputedStyle(container);
    const transform = computedStyle.transform;

    if (transform && transform !== "none") {
      const matrix = new DOMMatrix(transform);
      currentX = matrix.m41;
      currentY = matrix.m42;
    } else {
      currentX = initialRect.left;
      currentY = initialRect.top;
    }

    targetX = currentX;
    targetY = currentY;

    document.body.style.userSelect = "none";
    dragHandle.classList.add("dragging");

    // Start animation loop
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    updatePosition();
  };

  const endDrag = () => {
    isDragging = false;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    document.body.style.userSelect = "";
    dragHandle.classList.remove("dragging");
  };

  // Mouse events
  dragHandle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  });

  document.addEventListener(
    "mousemove",
    (e) => {
      if (isDragging && initialRect) {
        targetX = e.clientX - offsetX;
        targetY = e.clientY - offsetY;
      }
    },
    { passive: true },
  );

  document.addEventListener("mouseup", endDrag);

  // Touch events
  dragHandle.addEventListener(
    "touchstart",
    (e) => {
      const touch = e?.touches?.[0];
      if (!touch) return;
      startDrag(touch.clientX, touch.clientY);
      e.preventDefault();
    },
    { passive: false },
  );

  document.addEventListener(
    "touchmove",
    (e) => {
      if (isDragging && initialRect) {
        const touch = e?.touches?.[0];
        if (!touch) return;
        targetX = touch.clientX - offsetX;
        targetY = touch.clientY - offsetY;
        e.preventDefault();
      }
    },
    { passive: false },
  );

  document.addEventListener("touchend", endDrag);
  document.addEventListener("touchcancel", endDrag);

  minimizeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isCollapsed = container.getAttribute("data-collapsed") === "true";
    setCollapsed(!isCollapsed);
  });

  function validateInputs() {
    const w = parseInt(wInput.value, 10);
    const h = parseInt(hInput.value, 10);
    const isWidthValid = !Number.isNaN(w) && w > 0;
    const isHeightValid = !Number.isNaN(h) && h > 0;
    wInput.style.border = isWidthValid
      ? "1px solid #e6edf3"
      : "1px solid #ef4444";
    hInput.style.border = isHeightValid
      ? "1px solid #e6edf3"
      : "1px solid #ef4444";
    return isWidthValid && isHeightValid;
  }

  function validateStartButton() {
    const hasImage = originalImageUrl !== null;
    const hasStartingPoint =
      getCurrentDrawingConfig()?.startPoint !== null &&
      getCurrentDrawingConfig()?.startPoint !== undefined;
    const hasValidDimensions = validateInputs();
    const isRunning = wplaceBotState.running;

    const allRequirementsMet =
      hasImage && hasStartingPoint && hasValidDimensions;

    // Button is enabled if: requirements are met, OR bot is already running (so user can stop it)
    const shouldEnable = allRequirementsMet || isRunning;

    // Update button state
    startBtn.disabled = !shouldEnable;

    // Visual feedback
    if (shouldEnable) {
      startBtn.style.opacity = "1";
      startBtn.style.cursor = "pointer";

      if (isRunning) {
        startBtn.title = "Click to stop the bot";
      } else {
        startBtn.title = "";
      }
    } else {
      startBtn.style.opacity = "0.5";
      startBtn.style.cursor = "not-allowed";

      // Show helpful tooltip
      const missing = [];
      if (!hasImage) missing.push("image");
      if (!hasStartingPoint) missing.push("starting point");
      if (!hasValidDimensions) missing.push("valid dimensions");

      startBtn.title = `Missing required: ${missing.join(", ")}`;
    }

    return allRequirementsMet;
  }

  /**
   * Find the nearest wplace color ID for given RGBA values
   * @param {Object} c - Color object with r, g, b, a properties
   * @returns {string|null} Color ID as string or null if not found
   */
  function findNearestColorId(c) {
    if (c.r === 0 && c.g === 0 && c.b === 0) {
      if (c.a === 0) {
        return "0"; // Transparent
      } else {
        return "1"; // Black
      }
    }

    for (const [id, color] of Object.entries(ALL_COLORS_BY_ID)) {
      if (c.r === color.r && c.g === color.g && c.b === color.b) {
        return id;
      }
    }

    return null;
  }

  /**
   * Convert image directly to indices without dithering
   * @param {string} imageUrl - Image data URL
   * @param {number} width - Target width
   * @param {number} height - Target height
   * @returns {Promise<{indicesArray: number[][], validColors: boolean, invalidColors: string[]}>}
   */
  async function convertImageToIndices(imageUrl, width, height) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        // Draw and resize image
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);

        const indicesArray = Array(height)
          .fill()
          .map(() => Array(width).fill(0));
        const ownedColors = getOwnedColors();
        const ownedColorIds = new Set(ownedColors.map((c) => c.id));
        const invalidColors = new Set();
        let validColors = true;

        // Process each pixel
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const pixelIndex = (y * width + x) * 4;
            const r = imageData.data[pixelIndex];
            const g = imageData.data[pixelIndex + 1];
            const b = imageData.data[pixelIndex + 2];
            const a = imageData.data[pixelIndex + 3];

            // Find nearest wplace color
            const colorId = findNearestColorId({ r, g, b, a });

            if (colorId === null) {
              indicesArray[y][x] = 0; // Transparent/unknown
            } else {
              const id = parseInt(colorId, 10);
              indicesArray[y][x] = id;

              // Check if this color is available to current account
              if (!ownedColorIds.has(id)) {
                validColors = false;
                invalidColors.add(colorId);
              }
            }
          }
        }

        resolve({
          indicesArray,
          validColors,
          invalidColors: Array.from(invalidColors),
        });
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }

  /**
   * Detect edges in the image - only outer contours that border transparent areas
   * @param {number[][]} indices - 2D array of color indices
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {number[][]} New 2D array with only outline pixels (others set to 0)
   */
  function detectEdges(indices, width, height) {
    const edgeIndices = Array(height)
      .fill()
      .map(() => Array(width).fill(0));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const currentColor = indices[y][x];

        // Skip transparent pixels
        if (currentColor === 0) continue;

        let isOutline = false;

        // Check all 8 neighbors (including diagonals)
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            // Skip the center pixel
            if (dx === 0 && dy === 0) continue;

            const nx = x + dx;
            const ny = y + dy;

            // Check bounds - pixels at image boundaries are outline
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
              isOutline = true;
              break;
            }

            const neighborColor = indices[ny][nx];

            // ONLY consider it outline if neighbor is transparent (not different color)
            if (neighborColor === 0) {
              isOutline = true;
              break;
            }
          }
          if (isOutline) break;
        }

        // If this pixel borders transparency, it's part of the outline
        if (isOutline) {
          edgeIndices[y][x] = currentColor;
        }
      }
    }

    return edgeIndices;
  }

  async function performDither() {
    if (!originalImageUrl) {
      previewImg.src = "";
      previewImg.style.display = "none";
      previewImgPlaceholder.style.display = "flex";
      container.style.border = "1px solid var(--glass-border)";
      document
        .querySelector(".wplace-bot__preview")
        .classList.remove("has-image");
      return;
    }

    if (!validateInputs()) {
      container.style.border = "1px solid #ef4444";
      return;
    }
    const w = parseInt(wInput.value, 10);
    const h = parseInt(hInput.value, 10);
    container.style.border = "1px solid #e5e7eb";

    try {
      let ditherResult;

      // Check if skip reprocessing is enabled
      if (skipReprocessingInput.checked) {
        console.log(
          "🔄 Skip re-processing enabled, validating image colors...",
        );

        const directResult = await convertImageToIndices(
          originalImageUrl,
          w,
          h,
        );

        if (directResult.validColors) {
          console.log(
            "✅ All colors valid! Using image as-is without dithering.",
          );
          indicesArray = directResult.indicesArray;

          // Create a simple preview using the original image
          previewImg.src = originalImageUrl;
          previewImg.style.display = "block";
          previewImgPlaceholder.style.display = "none";
          document
            .querySelector(".wplace-bot__preview")
            .classList.add("has-image");
        } else {
          console.log(
            `❌ Invalid colors found: ${directResult.invalidColors.join(", ")}. Falling back to normal dithering.`,
          );
          alert(
            `Some colors in your image are not available to your account (${directResult.invalidColors.length} colors). Falling back to normal dithering.\n\nInvalid colors: ${directResult.invalidColors.slice(0, 5).join(", ")}${directResult.invalidColors.length > 5 ? "..." : ""}`,
          );

          // Fall back to normal dithering
          ditherResult = await ditherImageFromUrl(originalImageUrl, w, h, {
            paletteDefs: useDefaultColorsInput.checked
              ? null
              : getOwnedColors(),
            algorithm: advDitherAlgo.value,
            gamma: advGammaInput.value,
            serpentine: advSerpentineInput.checked,
            orderedSize: parseInt(advOrderedSizeInput.value, 10),
          });
          indicesArray = ditherResult.indicesArray;

          // Show dithered preview
          previewImg.src = ditherResult.dataUrl;
          previewImg.style.display = "block";
          previewImgPlaceholder.style.display = "none";
          document
            .querySelector(".wplace-bot__preview")
            .classList.add("has-image");
        }
      } else {
        // Normal dithering process
        ditherResult = await ditherImageFromUrl(originalImageUrl, w, h, {
          paletteDefs: useDefaultColorsInput.checked ? null : getOwnedColors(),
          algorithm: advDitherAlgo.value,
          gamma: advGammaInput.value,
          serpentine: advSerpentineInput.checked,
          orderedSize: parseInt(advOrderedSizeInput.value, 10),
        });
        indicesArray = ditherResult.indicesArray;

        // Show dithered preview
        previewImg.src = ditherResult.dataUrl;
        previewImg.style.display = "block";
        previewImgPlaceholder.style.display = "none";
        document
          .querySelector(".wplace-bot__preview")
          .classList.add("has-image");
      }

      // Apply edge detection if enabled
      if (drawEdgesOnlyInput.checked) {
        indicesArray = detectEdges(indicesArray, w, h);
      }

      // Calculate pixels to be colored. (The whole image)
      let pixelCount = 0;
      for (let y = 0; y < h; ++y) {
        for (let x = 0; x < w; ++x) {
          // Skip transparent pixels.
          if (indicesArray[y][x] !== 0) {
            pixelCount += 1;
          }
        }
      }
      pxCountInput.value = pixelCount;

      saveConfig();
      updateOverlay();

      // Analyze colors after successful dithering
      analyzeTemplateColors();
    } catch (error) {
      console.error("Dithering failed:", error);
      previewImg.src = originalImageUrl;
      if (originalImageUrl) {
        previewImg.style.display = "block";
        previewImgPlaceholder.style.display = "none";
        document
          .querySelector(".wplace-bot__preview")
          .classList.add("has-image");
      }
      alert("Failed to dither image.");
    }
  }

  // Click on placeholder to trigger file input
  previewImgPlaceholder.addEventListener("click", () => {
    fileInput.click();
  });

  // Make placeholder cursor pointer to indicate it's clickable
  previewImgPlaceholder.style.cursor = "pointer";

  // Drag and drop functionality
  previewImgPlaceholder.addEventListener("dragover", (e) => {
    e.preventDefault();
    previewImgPlaceholder.style.background = "rgba(59, 130, 246, 0.1)";
    previewImgPlaceholder.style.borderColor = "rgba(59, 130, 246, 0.3)";
  });

  previewImgPlaceholder.addEventListener("dragleave", (e) => {
    e.preventDefault();
    previewImgPlaceholder.style.background = "";
    previewImgPlaceholder.style.borderColor = "";
  });

  previewImgPlaceholder.addEventListener("drop", (e) => {
    e.preventDefault();
    previewImgPlaceholder.style.background = "";
    previewImgPlaceholder.style.borderColor = "";

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith("image/")) {
      // Simulate file input change event
      const fileList = new DataTransfer();
      fileList.items.add(files[0]);
      fileInput.files = fileList.files;

      // Trigger change event
      const changeEvent = new Event("change", { bubbles: true });
      fileInput.dispatchEvent(changeEvent);
    }
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        wInput.value = img.width;
        hInput.value = img.height;
        aspectRatio = img.width / img.height;
        performDither(img.width, img.height);
      };
      img.src = reader.result;

      // Only stop the bot if it's running
      if (wplaceBotState.running) {
        wplaceBotState.running = false;
        startBtn.textContent = "Start";
        console.log("Bot stopped due to new image upload");
      }

      // Clear only old image data and color palette, keep all settings
      originalImageUrl = reader.result;
      colorPalette = {};
      colorFilterHeader.style.display = "none";
      colorFilterContent.style.display = "none";
      buildColorFilterList();
      validateStartButton();
    };
    reader.onerror = (error) => {
      console.error("Could not load the image: ", error);
    };
  });

  function updateImageHeight(event) {
    if (lockAspectRatioInput.checked && aspectRatio !== 0) {
      hInput.value = Math.round(event.target.value / aspectRatio);
    }
  }
  function updateImageWidth(event) {
    if (lockAspectRatioInput.checked && aspectRatio !== 0) {
      wInput.value = Math.round(event.target.value / aspectRatio);
    }
  }

  wInput.addEventListener("input", (event) => {
    updateImageHeight(event);
    performDither();
    validateStartButton();
  });
  hInput.addEventListener("input", (event) => {
    updateImageWidth(event);
    performDither();
    validateStartButton();
  });

  lockAspectRatioInput.addEventListener("change", (_event) => {
    if (lockAspectRatioInput.checked) {
      hInput.value = Math.round(wInput.value / aspectRatio);
      performDither();
    }
    validateStartButton();
  });

  advDitherAlgo.addEventListener("input", performDither);
  advGammaInput.addEventListener("input", performDither);
  advOrderedSizeInput.addEventListener("input", performDither);
  advSerpentineInput.addEventListener("input", performDither);
  useDefaultColorsInput.addEventListener("input", performDither);
  drawEdgesOnlyInput.addEventListener("input", performDither);
  skipReprocessingInput.addEventListener("input", saveConfig); // Just save config, no re-dithering needed

  // Energy limit doesn't need re-dithering, just save config
  energyLimitInput.addEventListener("input", saveConfig);

  // Function to update advanced settings visibility based on algorithm
  function updateAdvancedSettingsVisibility() {
    const algorithm = advDitherAlgo.value;
    const orderedSizeRow = advOrderedSizeInput.parentElement;
    const serpentineRow = advSerpentineInput.parentElement;

    // Show ordered size only for "ordered" algorithm
    orderedSizeRow.style.display = algorithm === "ordered" ? "block" : "none";

    // Show serpentine only for compatible algorithms
    const serpentineCompatible = [
      "floyd-steinberg",
      "atkinson",
      "jarvis",
    ].includes(algorithm);
    serpentineRow.style.display = serpentineCompatible ? "block" : "none";
  }

  // Update visibility when algorithm changes
  advDitherAlgo.addEventListener("change", () => {
    updateAdvancedSettingsVisibility();
    performDither();
  });

  // Set initial visibility
  updateAdvancedSettingsVisibility();

  showOverlayInput.addEventListener("input", () => {
    saveConfig();
    updateOverlay();
  });

  // Color filter toggle
  colorFilterHeader.addEventListener("click", () => {
    const isHidden = colorFilterContent.style.display !== "flex";
    colorFilterContent.style.display = isHidden ? "flex" : "none";
    colorFilterChev.style.transform = isHidden ? "" : "rotate(-90deg)";

    // Toggle expanded class for consistent styling
    if (isHidden) {
      colorFilterHeader.classList.add("expanded");
    } else {
      colorFilterHeader.classList.remove("expanded");
    }
  });

  // Enable/Disable all colors
  enableAllColorsBtn.addEventListener("click", () => {
    Object.values(colorPalette).forEach((color) => {
      color.enabled = true;
    });
    buildColorFilterList();
    saveConfig();
    console.log("Enabled all colors");
  });

  disableAllColorsBtn.addEventListener("click", () => {
    Object.values(colorPalette).forEach((color) => {
      color.enabled = false;
    });
    buildColorFilterList();
    saveConfig();
    console.log("Disabled all colors");
  });

  wInput.addEventListener("change", (event) => {
    updateImageHeight(event);
    validateStartButton();
  });
  hInput.addEventListener("change", (event) => {
    updateImageWidth(event);
    validateStartButton();
  });

  setCurrentLocationBtn.addEventListener("click", () => {
    const currentLocation = getCurrentTileAndPixel();
    if (!currentLocation) {
      alert("No current location detected. Please click on the canvas first.");
      return;
    }

    if (wplaceBotState.running) {
      console.log("Bot is running, ignoring current location selection");
      return;
    }

    console.log("Setting current location as start point:", currentLocation);

    // Save it to the config
    const config = getCurrentDrawingConfig();
    config.startPoint = currentLocation;
    setCurrentDrawingConfig(config);

    // Update the input display
    startingPointInput.value = `Chunk: { x: ${currentLocation.tile.x}, y: ${currentLocation.tile.y} }, Pixel: { x: ${currentLocation.pixel.x}, y: ${currentLocation.pixel.y} }`;

    updateOverlay();
    validateStartButton();

    // Visual feedback
    setCurrentLocationBtn.style.background = "rgba(34, 197, 94, 0.2)"; // Green for success
    setTimeout(() => {
      setCurrentLocationBtn.style.background = "";
    }, 500);
  });

  clearStartingPoint.addEventListener("click", () => {
    const config = getCurrentDrawingConfig();
    config.startPoint = null;
    setCurrentDrawingConfig(config);

    startingPointInput.value = "";
    updateOverlay(); // Deletes the overlay
    validateStartButton();
  });

  autoStartCheckbox.addEventListener("input", (_event) => {
    const config = getCurrentDrawingConfig();
    config.autoStart = autoStartCheckbox.checked;
    setCurrentDrawingConfig(config);
  });

  function callStartWplaceBot() {
    if (!validateStartButton()) {
      console.error(
        "Could not start the bot because required fields are missing.",
      );
      return;
    }

    wplaceBotState.running = !wplaceBotState.running;
    if (wplaceBotState.running) {
      const width = parseInt(wInput.value, 10);
      const height = parseInt(hInput.value, 10);

      saveConfig();
      startWplaceBot({ width, height }, indicesArray);
    }
    startBtn.textContent = wplaceBotState.running ? "Stop" : "Start";
    validateStartButton(); // Update button state
  }

  startBtn.addEventListener("click", callStartWplaceBot);

  function clearWplaceBotState() {
    setCurrentDrawingConfig({});
    wInput.value = "";
    hInput.value = "";
    previewImg.src = "";
    previewImg.style.display = "none";
    previewImgPlaceholder.style.display = "flex";
    document
      .querySelector(".wplace-bot__preview")
      .classList.remove("has-image");
    pxCountInput.value = "";
    startingPointInput.value = "";
    autoStartCheckbox.checked = false;
    useDefaultColorsInput.checked = false;
    drawEdgesOnlyInput.checked = false;
    skipReprocessingInput.checked = false;
    energyLimitInput.value = ""; // Clear energy limit
    originalImageUrl = null;

    // Clear color palette and hide color filter section
    colorPalette = {};
    colorFilterHeader.style.display = "none";
    colorFilterContent.style.display = "none";
    buildColorFilterList();
    validateStartButton();
  }

  clearBtn.addEventListener("click", clearWplaceBotState);

  // Advanced settings toggle
  advHeader.addEventListener("click", () => {
    const isHidden = advContent.style.display !== "flex";
    advContent.style.display = isHidden ? "flex" : "none";
    advChev.style.transform = isHidden ? "" : "rotate(-90deg)";

    // Toggle expanded class for consistent styling
    if (isHidden) {
      advHeader.classList.add("expanded");
    } else {
      advHeader.classList.remove("expanded");
    }
  });

  copyConfigBtn.addEventListener("click", async (e) => {
    e.preventDefault(); // Prevent any default behavior
    e.stopPropagation(); // Stop event bubbling

    try {
      const config = getCurrentDrawingConfig();
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));

      // Visual feedback for successful copy
      copyConfigBtn.style.background = "rgba(59, 130, 246, 0.2)";
      setTimeout(() => {
        copyConfigBtn.style.background = "";
      }, 300);
    } catch (error) {
      console.error("Failed to copy config:", error);
      alert("Failed to copy configuration to clipboard!");
    }
  });

  // More aggressive paste implementation to prevent context menu
  const handlePaste = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Immediate visual feedback to show action is processing
    pasteConfigBtn.style.background = "rgba(255, 193, 7, 0.2)"; // Yellow for processing

    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        pasteConfigBtn.style.background = "rgba(220, 38, 127, 0.2)"; // Red for error
        setTimeout(() => {
          pasteConfigBtn.style.background = "";
        }, 500);
        alert("Clipboard is empty!");
        return;
      }

      const oldConfig = getCurrentDrawingConfig();
      try {
        const newConfig = JSON.parse(text);
        setCurrentDrawingConfig(newConfig);
        if (!loadConfig()) {
          setCurrentDrawingConfig(oldConfig);
          pasteConfigBtn.style.background = "rgba(220, 38, 127, 0.2)"; // Red for error
          setTimeout(() => {
            pasteConfigBtn.style.background = "";
          }, 500);
          alert("Invalid configuration format!");
        } else {
          // Visual feedback for successful paste
          pasteConfigBtn.style.background = "rgba(34, 197, 94, 0.2)"; // Green for success
          setTimeout(() => {
            pasteConfigBtn.style.background = "";
          }, 500);
        }
      } catch (parseError) {
        console.error("Failed to parse config:", parseError);
        pasteConfigBtn.style.background = "rgba(220, 38, 127, 0.2)"; // Red for error
        setTimeout(() => {
          pasteConfigBtn.style.background = "";
        }, 500);
        alert("Invalid JSON format in clipboard!");
      }
    } catch (clipboardError) {
      console.error("Failed to read clipboard:", clipboardError);
      pasteConfigBtn.style.background = "rgba(220, 38, 127, 0.2)"; // Red for error
      setTimeout(() => {
        pasteConfigBtn.style.background = "";
      }, 500);
      alert(
        "Failed to access clipboard. Make sure you have clipboard permissions.",
      );
    }

    return false;
  };

  // Use both click and mouseup events to ensure it works
  pasteConfigBtn.addEventListener("click", handlePaste, { capture: true });
  pasteConfigBtn.addEventListener(
    "mouseup",
    (e) => {
      if (e.button === 0) {
        // Left click only
        handlePaste(e);
      }
    },
    { capture: true },
  );

  // Disable context menu on copy/paste buttons to prevent interference
  copyConfigBtn.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  });

  pasteConfigBtn.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  });

  // Also prevent mousedown context menu behavior
  pasteConfigBtn.addEventListener("mousedown", (e) => {
    if (e.button === 2) {
      // Right click
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  });

  copyConfigBtn.addEventListener("mousedown", (e) => {
    if (e.button === 2) {
      // Right click
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  });

  function getOwnedColors() {
    const extraColorsBitmap = wplaceBotState.userInfo.extraColorsBitmap;
    const PREMIUM_COLORS_LOWER_BOUND = 32;

    return Object.keys(ALL_COLORS_BY_ID)
      .filter(
        (id) =>
          id < PREMIUM_COLORS_LOWER_BOUND ||
          (id >= PREMIUM_COLORS_LOWER_BOUND &&
            (extraColorsBitmap & (1 << (id - PREMIUM_COLORS_LOWER_BOUND))) !==
              0),
      )
      .map((id) => ({ id: Number(id), ...ALL_COLORS_BY_ID[id] }));
  }

  function analyzeTemplateColors() {
    if (!indicesArray) {
      return;
    }

    const newColorPalette = {};
    const w = parseInt(wInput.value, 10);
    const h = parseInt(hInput.value, 10);

    // Count pixels for each color
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const colorId = indicesArray[y][x];
        if (colorId !== 0) {
          // Skip transparent
          const colorKey = colorId.toString();
          if (!newColorPalette[colorKey]) {
            const colorInfo = ALL_COLORS_BY_ID[colorId];
            newColorPalette[colorKey] = {
              id: colorId,
              name: colorInfo ? colorInfo.name : `Color ${colorId}`,
              rgb: colorInfo
                ? `${colorInfo.r},${colorInfo.g},${colorInfo.b}`
                : "128,128,128",
              hex: colorInfo ? colorInfo.hex : "#808080",
              count: 0,
              enabled: colorPalette[colorKey]?.enabled !== false, // Default to true, unless explicitly disabled
            };
          }
          newColorPalette[colorKey].count++;
        }
      }
    }

    colorPalette = newColorPalette;
    buildColorFilterList();
    saveConfig();

    // Show the color filter section if we have colors
    if (Object.keys(colorPalette).length > 0) {
      colorFilterHeader.style.display = "";
    } else {
      colorFilterHeader.style.display = "none";
    }
  }

  function buildColorFilterList() {
    if (!colorFilterList || Object.keys(colorPalette).length === 0) {
      if (colorFilterList) {
        colorFilterList.innerHTML = `
          <div style="text-align: center; color: var(--text-placeholder); font-size: 12px; padding: 20px;">
            Upload and process a template to see colors
          </div>
        `;
      }
      return;
    }

    // Sort colors by count (most used first)
    const entries = Object.entries(colorPalette).sort(
      (a, b) => b[1].count - a[1].count,
    );

    colorFilterList.innerHTML = "";

    for (const [colorId, meta] of entries) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "8px";
      row.style.margin = "4px 0";
      row.style.padding = "4px";
      row.style.borderRadius = "4px";
      row.style.background = "var(--glass-bg)";
      row.style.border = "1px solid var(--glass-border)";

      // Color swatch
      const swatch = document.createElement("div");
      swatch.style.width = "16px";
      swatch.style.height = "16px";
      swatch.style.border = "1px solid var(--border-color)";
      swatch.style.borderRadius = "2px";
      swatch.style.flexShrink = "0";

      if (meta.rgb) {
        swatch.style.background = `rgb(${meta.rgb})`;
      } else {
        swatch.style.background = meta.hex || "#808080";
      }

      // Checkbox
      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.checked = meta.enabled;
      toggle.style.width = "14px";
      toggle.style.height = "14px";
      toggle.addEventListener("change", () => {
        meta.enabled = toggle.checked;
        saveConfig();

        // Visual feedback
        row.style.opacity = meta.enabled ? "1" : "0.5";

        console.log(
          `${meta.enabled ? "Enabled" : "Disabled"} color ${meta.name}`,
        );
      });

      // Label
      const label = document.createElement("span");
      label.style.fontSize = "11px";
      label.style.color = "var(--text-color)";
      label.style.fontWeight = "500";
      label.style.flex = "1";

      let displayName = meta.name || `Color ${colorId}`;
      if (displayName.length > 15) {
        displayName = displayName.substring(0, 12) + "...";
      }

      label.textContent = `#${colorId} ${displayName} • ${meta.count.toLocaleString()}`;
      label.title = `${meta.name || `Color ${colorId}`} - ${meta.count.toLocaleString()} pixels`;

      // Initial opacity based on enabled state
      row.style.opacity = meta.enabled ? "1" : "0.5";

      row.appendChild(toggle);
      row.appendChild(swatch);
      row.appendChild(label);
      colorFilterList.appendChild(row);
    }
  }

  function updateOverlay() {
    const config = getCurrentDrawingConfig();

    if (config.showOverlay && indicesArray && config.startPoint) {
      // Map indices to color data
      const pixelColors = indicesArray.map((array) =>
        array.map((index) => ALL_COLORS_BY_ID[index]),
      );

      // Show overlay using classic alpha blending
      window.postMessage({
        source: "pixelbot",
        pixels: pixelColors,
        width: parseInt(wInput.value, 10),
        height: parseInt(hInput.value, 10),
        startPoint: config.startPoint,
        overlayStyle: "blend", // Always use classic alpha blending
      });
    } else {
      // Hide overlay
      window.postMessage({
        source: "pixelbot",
        pixels: null, // This will signal to hide the overlay
        width: 0,
        height: 0,
        startPoint: null,
        overlayStyle: null,
      });
    }
  }
};
fetch("https://raw.githubusercontent.com/cancanakci/diHter/main/dihter.js")
  .then((res) => res.text())
  .then((code) => {
    const script = document.createElement("script");
    script.textContent = code;
    document.body.appendChild(script);
    wplaceBotPopupInit();
  })
  .catch((err) => console.error("Failed to load script:", err));
