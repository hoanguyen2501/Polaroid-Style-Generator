const upload = document.getElementById('upload');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const downloadBtn = document.getElementById('download');
const template = document.getElementById('template');
const aspect = document.getElementById('aspect');
const POLAROID_TEMPLATE = 'polaroid';
const NORMAL_TEMPLATE = 'normal';
const borderThickness = document.getElementById('border-thickness');
let BORDER_SIZE = parseInt(borderThickness.value) || 40;
const OUTPUT_WIDTH = 1200; // You can change this to any base size

let originalFileName = 'image_polaroid.jpg';
let currentFile = null;
let defaultImageURL = "images/P1150666.jpg"; // local fallback image
let currentTemplate = template.value;
const fileLimitMsg = document.getElementById("file-limit");

const slideshow = document.getElementById("slideshow");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");

let images = [];
let currentIndex = 0;

function loadImageFromURL(url, name = "P1150666") {
    const img = new Image();
    img.onload = function () {
        // Convert loaded image to blob and fake a File object
        fetch(url)
            .then(res => res.blob())
            .then(blob => {
                currentFile = new File([blob], name, { type: blob.type });
                originalFileName = name.replace(/\.[^/.]+$/, '') + `_${template.value}.jpg`;
                generateTemplate(template.value, currentFile);
            });
    };
    img.src = url;
}

function isAspectDisabled(currentTemplate) {
    return currentTemplate === POLAROID_TEMPLATE;
}

// Load default image on startup
window.addEventListener("DOMContentLoaded", () => {
    loadImageFromURL(defaultImageURL, "P1150666.jpg");
    aspect.disabled = isAspectDisabled(currentTemplate);
    console.log(typeof borderThickness.value);
});

function generateTemplate(templateId, file) {
    if (templateId === POLAROID_TEMPLATE) {
        polaroidGenerator(file);
    } else {
        borderGenerator(file);
    }
}

function parseAspectRatio(aspect) {
    switch (aspect) {
        case '43':
            return 4 / 3;
        case '32':
            return 3 / 2;
        case '45':
            return 4 / 5;
        case '11':
            return 1;
        case '34':
            return 3 / 4;

        default:
            return 4 / 3;
    }
}

function borderGenerator(file) {
    const targetRatio = parseAspectRatio(aspect.value); // width / height
    const img = new Image();
    img.onload = function () {
        const imgW = img.width;
        const imgH = img.height;

        const fullW = imgW + BORDER_SIZE * 2;
        const fullH = imgH + BORDER_SIZE * 2;
        const fullRatio = fullW / fullH;

        let canvasW, canvasH;

        if (fullRatio > targetRatio) {
            // The image+border is wider than target, so match width
            canvasW = fullW;
            canvasH = canvasW / targetRatio;
        } else {
            // The image+border is taller than target, so match height
            canvasH = fullH;
            canvasW = canvasH * targetRatio;
        }

        canvas.width = Math.round(canvasW);
        canvas.height = Math.round(canvasH);

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Now compute image position
        const availableW = canvasW - BORDER_SIZE * 2;
        const availableH = canvasH - BORDER_SIZE * 2;

        // Scale image to fit inside (with aspect ratio preserved)
        const scale = Math.min(availableW / imgW, availableH / imgH);
        const drawW = imgW * scale;
        const drawH = imgH * scale;

        const offsetX = (canvasW - drawW) / 2;
        const offsetY = (canvasH - drawH) / 2;

        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        canvas.classList.remove('hidden');
        downloadBtn.classList.remove('hidden');
    };

    img.src = URL.createObjectURL(file);
}

function polaroidGenerator(file) {
    const img = new Image();
    img.onload = function () {
        const imgW = img.width;
        const imgH = img.height;

        // Frame sizes (as percent of image size)
        const frameSides = BORDER_SIZE;
        const frameTop = frameSides;
        const frameBottom = frameSides * 3;

        const canvasW = imgW + frameSides * 2;
        const canvasH = imgH + frameTop + frameBottom;

        canvas.width = canvasW;
        canvas.height = canvasH;

        // Fill white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Draw image in center
        ctx.drawImage(img, frameSides, frameTop, imgW, imgH);

        canvas.classList.remove('hidden');
        downloadBtn.classList.remove('hidden');
    };
    img.src = URL.createObjectURL(file);
}

template.addEventListener('change', function (event) {
    currentTemplate = event.target.value;
    aspect.disabled = isAspectDisabled(currentTemplate);
    generateTemplate(currentTemplate, currentFile);
});

aspect.addEventListener('change', function (event) {
    if (template.value === NORMAL_TEMPLATE)
        borderGenerator(currentFile);
});

upload.addEventListener('change', function (event) {
    const files = Array.from(event.target.files);
    if (files.length > 10) {
        fileLimitMsg.classList.remove('hidden');
        return;
    }
    fileLimitMsg.classList.add('hidden');

    images = files.map((file) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        return { file, img };
    });

    const file = upload.files[0];
    if (!file) return;

    currentIndex = 0;
    slideshow.classList.remove("hidden");
    downloadBtn.classList.remove("hidden");
    currentFile = images[currentIndex].file;
    generateTemplate(currentTemplate, currentFile);

    images[currentIndex].onload = () => generateTemplate(currentTemplate, currentFile);
});

prevBtn.addEventListener("click", () => {
    if (images.length > 0) {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        currentFile = images[currentIndex].file;
        generateTemplate(currentTemplate, currentFile);
    }
});

nextBtn.addEventListener("click", () => {
    if (images.length > 0) {
        currentIndex = (currentIndex + 1) % images.length;
        currentFile = images[currentIndex].file;
        generateTemplate(currentTemplate, currentFile);
    }
});

downloadBtn.addEventListener('click', async () => {
    if (images.length > 1) {
        const zip = new JSZip();
        for (let i = 0; i < images.length; i++) {
            const { file, img } = images[i];
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const fileName = `${baseName}_${currentTemplate}.jpg`;
            await new Promise((resolve) => {
                img.onload = () => {
                    generateTemplate(currentTemplate, file);
                    canvas.toBlob((blob) => {
                        zip.file(fileName, blob);
                        resolve();
                    }, "image/jpeg", 1);
                };

                // if already loaded, trigger immediately
                if (img.complete) {
                    img.onload();
                }
            });
        }

        zip.generateAsync({ type: "blob" }).then((content) => {
            saveAs(content, "polaroid-frames.zip");
        });
    } else {
        const link = document.createElement('a');
        const baseName = currentFile.name.replace(/\.[^/.]+$/, '');
        originalFileName = `${baseName}_${currentTemplate}.jpg`;
        link.download = originalFileName;
        link.href = canvas.toDataURL('image/jpg', 1.0);
        link.click();
    }
});

function debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

borderThickness.addEventListener('input',
    debounce((event) => {
        BORDER_SIZE = parseInt(event.target.value) || 40;
        generateTemplate(currentTemplate, currentFile);
    }, 300)
);
