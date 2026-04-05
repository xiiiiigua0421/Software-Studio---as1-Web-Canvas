// ==========================================
// 1. 全域變數與初始化 (Globals & Init)
// ==========================================
const container = document.getElementById('canvas-container');
const layer0 = document.getElementById('layer0');
const layer1 = document.getElementById('layer1');
const ctx0 = layer0.getContext('2d');
const ctx1 = layer1.getContext('2d');

const canvases = [layer0, layer1];
const contexts = [ctx0, ctx1];

let activeLayerIndex = 1;
let currentCtx = contexts[activeLayerIndex];

// 狀態與工具變數 (初始工具改為 'cursor')
let isDrawing = false;
let currentTool = 'cursor'; 
let currentColor = 'rgba(0,0,0,1)';
let currentSize = 5;
let uploadedImage = null;
let brushType = 'normal'; // 預設為普通畫筆
let lastTime = 0, lastX = 0, lastY = 0, lastLineWidth = 0;

// 防閃爍快照與座標
let startX, startY;
let snapshot;


// ==========================================
// 2. 歷史紀錄系統 (Undo / Redo)
// ==========================================
let undoStacks = [[], []]; 
let redoStacks = [[], []];
const MAX_HISTORY = 50;

function saveState() {
    const canvas = canvases[activeLayerIndex];
    const ctx = contexts[activeLayerIndex];
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    undoStacks[activeLayerIndex].push(currentState);
    if (undoStacks[activeLayerIndex].length > MAX_HISTORY) {
        undoStacks[activeLayerIndex].shift();
    }
    redoStacks[activeLayerIndex] = []; 
}


// ==========================================
// 3. 繪圖核心系統 (Drawing Core)
// ==========================================
function startPosition(e) {
    // 如果是游標工具，直接中斷，不執行任何繪圖動作
    if (currentTool === 'cursor') return;

    saveState(); 
    isDrawing = true;
    
    // 👇 使用清爽的相對座標 offsetX / offsetY
    startX = e.offsetX;
    startY = e.offsetY;

    snapshot = currentCtx.getImageData(0, 0, canvases[activeLayerIndex].width, canvases[activeLayerIndex].height);

    if (currentTool === 'brush' || currentTool === 'eraser') {
        currentCtx.beginPath();
        currentCtx.moveTo(startX, startY);
        
        // 👇 新增：紀錄初始狀態，供書法畫筆計算速度用
        lastX = startX;
        lastY = startY;
        lastTime = Date.now();
        lastLineWidth = currentSize;
        
        draw(e);
    }
}

function endPosition() {
    if (!isDrawing) return;
    isDrawing = false;
    currentCtx.beginPath(); 
}

function draw(e) {
    if (!isDrawing) return;

    // 👇 使用清爽的相對座標 offsetX / offsetY
    const x = e.offsetX;
    const y = e.offsetY;

    currentCtx.lineCap = 'round';
    currentCtx.lineJoin = 'round'; 

    if (['rect', 'circle', 'triangle', 'image'].includes(currentTool)) {
        currentCtx.putImageData(snapshot, 0, 0);
        currentCtx.globalCompositeOperation = 'source-over';
        currentCtx.strokeStyle = currentColor;
        currentCtx.beginPath(); 
    }

    if (currentTool === 'eraser') {
        currentCtx.globalCompositeOperation = 'destination-out';
        currentCtx.strokeStyle = "rgba(0,0,0,1)";
        currentCtx.lineTo(x, y);
        currentCtx.stroke();
        currentCtx.beginPath();
        currentCtx.moveTo(x, y);
    } 
    else if (currentTool === 'brush') {
        currentCtx.globalCompositeOperation = 'source-over';
        currentCtx.strokeStyle = currentColor;

        // 👇 新增：判斷是普通畫筆還是書法模式
        if (brushType === 'calligraphy') {
            const now = Date.now();
            const dt = Math.max(1, now - lastTime); // 避免除以 0
            const dx = x - lastX;
            const dy = y - lastY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const velocity = dist / dt; // 計算速度

            // 速度越快，筆觸越細 (減去速度乘上一個靈敏度係數)
            const targetWidth = Math.max(1, currentSize - velocity * 4);
            
            // 平滑過渡 (Easing)：上一點寬度佔 70%，目標寬度佔 30%
            const lineWidth = lastLineWidth * 0.7 + targetWidth * 0.3;

            currentCtx.lineWidth = lineWidth;
            
            // 更新狀態供下一個 Frame 使用
            lastLineWidth = lineWidth;
            lastTime = now;
            lastX = x;
            lastY = y;
        } else {
            currentCtx.lineWidth = currentSize;
        }

        currentCtx.lineTo(x, y);
        currentCtx.stroke();
        currentCtx.beginPath();
        currentCtx.moveTo(x, y);
    }
    else if (currentTool === 'rect') {
        let w = x - startX, h = y - startY;
        if (e.ctrlKey) {
            const size = Math.max(Math.abs(w), Math.abs(h));
            w = w > 0 ? size : -size;
            h = h > 0 ? size : -size;
        }
        currentCtx.rect(startX, startY, w, h);
        currentCtx.stroke();
    } 
    else if (currentTool === 'circle') {
        let w = x - startX, h = y - startY;
        if (e.ctrlKey) {
            const size = Math.max(Math.abs(w), Math.abs(h));
            const radius = size / 2;
            const centerX = startX + (w > 0 ? radius : -radius);
            const centerY = startY + (h > 0 ? radius : -radius);
            currentCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            currentCtx.stroke();
        } else {
            currentCtx.ellipse(startX + w / 2, startY + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, 2 * Math.PI);
            currentCtx.stroke();
        }
    }
    else if (currentTool === 'triangle') {
        let dx = x - startX, dy = y - startY;
        if (e.ctrlKey) {
            const size = Math.max(Math.abs(dx), Math.abs(dy));
            dx = dx > 0 ? size : -size;
            dy = (dy > 0 ? size : -size) / (2 / Math.sqrt(3));
        }
        currentCtx.moveTo(startX + dx / 2, startY);
        currentCtx.lineTo(startX + dx, startY + dy);
        currentCtx.lineTo(startX, startY + dy);
        currentCtx.closePath();
        currentCtx.stroke();
    }
}

// 綁定畫布滑鼠事件
container.addEventListener('mousedown', (e) => {
    // 👇 新增：吸管工具邏輯
    if (currentTool === 'eyedropper') {
        const x = e.offsetX;
        const y = e.offsetY;
        let picked = false;

        // 從最上層 (layer1) 往下檢查到最底層 (layer0)
        for (let i = canvases.length - 1; i >= 0; i--) {
            if (canvases[i].style.display !== 'none') {
                const pixel = contexts[i].getImageData(x, y, 1, 1).data;
                // 如果 alpha 值大於 0 (非透明)
                if (pixel[3] > 0) {
                    applySelectedColor(pixel[0], pixel[1], pixel[2]);
                    updateColorPickerUI(pixel[0], pixel[1], pixel[2]);
                    picked = true;
                    break;
                }
            }
        }
        // 如果圖層都是透明的，就吸取背景的白色
        if (!picked) {
            applySelectedColor(255, 255, 255);
            updateColorPickerUI(255, 255, 255);
        }
        
        // 吸完顏色自動切回畫筆
        document.getElementById('btn-brush').click();
        return; 
    }

    // ... 下方保留你原本的 cursor, text, startPosition 等邏輯 ...
    // 游標模式下點擊不作任何事
    if (currentTool === 'cursor') return;
    
    // 👇 新增：油漆桶邏輯
    if (currentTool === 'bucket') {
        saveState(); // 記得存檔支援 Undo
        floodFill(Math.floor(e.offsetX), Math.floor(e.offsetY));
        return; 
    }

    if (currentTool === 'text') {
        saveState(); 
        
        // 👇 文字輸入框也使用相對座標
        const x = e.offsetX;
        const y = e.offsetY;
        
        const fontFamily = document.getElementById('font-family').value;
        const fontSize = document.getElementById('font-size').value;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'text-input-overlay';
        input.style.left = `${x}px`;
        input.style.top = `${y}px`;
        input.style.fontFamily = fontFamily;
        input.style.fontSize = `${fontSize}px`;
        input.style.color = currentColor;
        input.style.height = `${parseInt(fontSize) + 4}px`; 

        container.appendChild(input);
        setTimeout(() => input.focus(), 0);

        const finishText = () => {
            if (input.parentElement) {
                if (input.value.trim() !== '') {
                    currentCtx.font = `${fontSize}px ${fontFamily}`;
                    currentCtx.fillStyle = currentColor;
                    currentCtx.textBaseline = 'top';
                    currentCtx.fillText(input.value, x, y);
                }
                container.removeChild(input);
            }
        };

        input.addEventListener('blur', finishText);
        input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') finishText(); });
        return; 
    }
    
    startPosition(e);
});

container.addEventListener('mousemove', draw);
container.addEventListener('mouseup', endPosition);
container.addEventListener('mouseleave', endPosition);

// ==========================================
// 油漆桶演算法 (Scanline Flood Fill)
// ==========================================
function floodFill(startX, startY) {
    const canvas = canvases[activeLayerIndex];
    const ctx = contexts[activeLayerIndex];
    const w = canvas.width;
    const h = canvas.height;
    
    // 取得畫布全部的像素資料 (一維陣列：[R, G, B, A, R, G, B, A...])
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // 將目前的 currentColor (例如 'rgb(255, 0, 0)') 轉為數值陣列
    const colorMatch = currentColor.match(/\d+/g);
    if (!colorMatch) return;
    const fillR = parseInt(colorMatch[0]);
    const fillG = parseInt(colorMatch[1]);
    const fillB = parseInt(colorMatch[2]);
    const fillA = 255; // 油漆桶填入實色

    // 取得起點像素的顏色 (目標顏色)
    const startPos = (startY * w + startX) * 4;
    const targetR = data[startPos];
    const targetG = data[startPos + 1];
    const targetB = data[startPos + 2];
    const targetA = data[startPos + 3];

    // 如果點擊的地方已經是我們要填的顏色，就提早結束 (避免死迴圈)
    if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) {
        return;
    }

    // 檢查某個像素是否符合目標顏色
    const matchColor = (pos) => {
        return data[pos] === targetR &&
               data[pos + 1] === targetG &&
               data[pos + 2] === targetB &&
               data[pos + 3] === targetA;
    };

    // 將像素上色
    const colorPixel = (pos) => {
        data[pos] = fillR;
        data[pos + 1] = fillG;
        data[pos + 2] = fillB;
        data[pos + 3] = fillA;
    };

    // 使用 Stack 儲存掃描點 (Scanline)
    const pixelStack = [[startX, startY]];

    while (pixelStack.length > 0) {
        const newPos = pixelStack.pop();
        const x = newPos[0];
        let y = newPos[1];

        let currentPos = (y * w + x) * 4;

        // 1. 往上走到邊界，找到該欄的最頂端相連目標色
        while (y >= 0 && matchColor(currentPos)) {
            y--;
            currentPos -= w * 4;
        }
        
        // 退回一格回到有效像素
        y++;
        currentPos += w * 4;

        let reachLeft = false;
        let reachRight = false;

        // 2. 開始往下掃描並上色
        while (y < h && matchColor(currentPos)) {
            colorPixel(currentPos);

            // 檢查左側
            if (x > 0) {
                if (matchColor(currentPos - 4)) {
                    if (!reachLeft) {
                        pixelStack.push([x - 1, y]);
                        reachLeft = true;
                    }
                } else if (reachLeft) {
                    reachLeft = false;
                }
            }

            // 檢查右側
            if (x < w - 1) {
                if (matchColor(currentPos + 4)) {
                    if (!reachRight) {
                        pixelStack.push([x + 1, y]);
                        reachRight = true;
                    }
                } else if (reachRight) {
                    reachRight = false;
                }
            }

            // 往下走一格
            y++;
            currentPos += w * 4;
        }
    }

    // 將更新後的像素陣列放回畫布
    ctx.putImageData(imgData, 0, 0);
}

// ==========================================
// 4. UI 互動與工具切換 (UI & Tools)
// ==========================================
const toolBtns = document.querySelectorAll('.tool-btn');
const customCursor = document.getElementById('custom-cursor');

function updateCursorSize() {
    if (customCursor) {
        customCursor.style.width = `${currentSize}px`;
        customCursor.style.height = `${currentSize}px`;
    }
}
updateCursorSize();

// 預設將游標設為 default (配合 HTML 裡初始的 Cursor 工具)
container.style.cursor = 'default';

toolBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        if(btn.id === 'btn-undo' || btn.id === 'btn-redo') return;

        if (btn.id === 'btn-brush' && currentTool === 'brush') {
            // 已經是畫筆狀態下再次點擊，觸發切換
            brushType = brushType === 'normal' ? 'calligraphy' : 'normal';
            // 替換按鈕圖示與提示
            btn.innerText = brushType === 'calligraphy' ? '🖌️' : '✏️'; 
            btn.title = brushType === 'calligraphy' ? 'Brush (書法模式)' : 'Brush (普通模式)';
            return; // 切換完就跳出，不需要跑後面的重置邏輯
        }

        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTool = btn.id.replace('btn-', '');
        
        // 在 toolBtns.forEach 的事件監聽器內...
        if (currentTool === 'image') {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image();
                        // 👇 確保圖片載入完成後，才啟動編輯器
                        img.onload = () => {
                            initImageEditor(img);
                        };
                        img.src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                } else {
                    // 如果取消上傳，切回游標
                    document.getElementById('btn-cursor').click();
                }
            };
            fileInput.click();
        }
        
        // 👇 新增：判斷 Cursor 工具，顯示系統預設鼠標
        let cursorType = 'crosshair'; 
        if (currentTool === 'cursor') {
            cursorType = 'default';
        } else if (currentTool === 'eraser') {
            cursorType = 'none';
        } else if (currentTool === 'text') {
            cursorType = 'text';
            if (customCursor) customCursor.style.display = 'none';
        } else {
            if (customCursor) customCursor.style.display = 'none';
        }
        
        container.style.cursor = cursorType;
        canvases.forEach(canvas => canvas.style.cursor = cursorType);
    });
});

document.getElementById('brush-size').addEventListener('input', (e) => {
    currentSize = e.target.value;
    document.getElementById('size-display').innerText = currentSize;
    updateCursorSize();
});

// 全域游標追蹤 (這裡保留 clientX 計算，用來判斷滑鼠是否在畫布內)
window.addEventListener('mousemove', (e) => {
    if (!customCursor || !container) return;
    if (currentTool !== 'brush' && currentTool !== 'eraser') {
        customCursor.style.display = 'none';
        return;
    }

    const rect = container.getBoundingClientRect();
    const isInsideCanvas = (
        e.clientX >= rect.left && e.clientX <= rect.right && 
        e.clientY >= rect.top && e.clientY <= rect.bottom
    );

    if (isInsideCanvas) {
        customCursor.style.display = 'block';
        customCursor.style.left = `${e.clientX - rect.left}px`;
        customCursor.style.top = `${e.clientY - rect.top}px`;
    } else {
        customCursor.style.display = 'none';
    }
});


// ==========================================
// 5. 調色盤系統 (Color Picker)
// ==========================================
const colorBlock = document.getElementById('color-block');
const blockCtx = colorBlock.getContext('2d', { willReadFrequently: true });
const colorStrip = document.getElementById('color-strip');
const stripCtx = colorStrip.getContext('2d', { willReadFrequently: true });

let baseColor = currentColor;
let pickerX = 120, pickerY = 0;

function drawColorStrip() {
    stripCtx.clearRect(0, 0, colorStrip.width, colorStrip.height);
    const gradient = stripCtx.createLinearGradient(0, 0, 0, colorStrip.height);
    gradient.addColorStop(0, 'rgb(255, 0, 0)'); gradient.addColorStop(0.17, 'rgb(255, 255, 0)');
    gradient.addColorStop(0.34, 'rgb(0, 255, 0)'); gradient.addColorStop(0.51, 'rgb(0, 255, 255)');
    gradient.addColorStop(0.68, 'rgb(0, 0, 255)'); gradient.addColorStop(0.85, 'rgb(255, 0, 255)');
    gradient.addColorStop(1, 'rgb(255, 0, 0)');
    stripCtx.fillStyle = gradient; stripCtx.fillRect(0, 0, colorStrip.width, colorStrip.height);
}

function drawColorBlock(showMarker = true) {
    blockCtx.clearRect(0, 0, colorBlock.width, colorBlock.height);
    blockCtx.fillStyle = baseColor; blockCtx.fillRect(0, 0, colorBlock.width, colorBlock.height);

    const whiteGrad = blockCtx.createLinearGradient(0, 0, colorBlock.width, 0);
    whiteGrad.addColorStop(0, 'rgba(255,255,255,1)'); whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
    blockCtx.fillStyle = whiteGrad; blockCtx.fillRect(0, 0, colorBlock.width, colorBlock.height);

    const blackGrad = blockCtx.createLinearGradient(0, 0, 0, colorBlock.height);
    blackGrad.addColorStop(0, 'rgba(0,0,0,0)'); blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
    blockCtx.fillStyle = blackGrad; blockCtx.fillRect(0, 0, colorBlock.width, colorBlock.height);

    if (showMarker) {
        blockCtx.beginPath(); blockCtx.arc(pickerX, pickerY, 4, 0, Math.PI * 2);
        blockCtx.strokeStyle = 'white'; blockCtx.lineWidth = 1.5; blockCtx.stroke();
        blockCtx.beginPath(); blockCtx.arc(pickerX, pickerY, 5, 0, Math.PI * 2);
        blockCtx.strokeStyle = 'black'; blockCtx.lineWidth = 1; blockCtx.stroke();
    }
}

drawColorStrip(); drawColorBlock();

function applySelectedColor(r, g, b) {
    currentColor = `rgb(${r}, ${g}, ${b})`;
    document.getElementById('color-preview').style.backgroundColor = currentColor;
    document.getElementById('color-text').innerText = currentColor;
    document.getElementById('slider-r').value = r;
    document.getElementById('slider-g').value = g;
    document.getElementById('slider-b').value = b;
    
    // 如果目前是安全游標，選完顏色自動幫切換到畫筆
    if (currentTool === 'cursor') document.getElementById('btn-brush').click();
}

let isPickingBlock = false, isPickingStrip = false, animationFrameId = null;

function pickColor(clientX, clientY, ctx, canvas, isStrip) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(Math.max(0, Math.min(clientX - rect.left, canvas.width - 1)));
    const y = Math.floor(Math.max(0, Math.min(clientY - rect.top, canvas.height - 1)));
    
    if (isStrip) {
        const pixel = ctx.getImageData(x, y, 1, 1).data; 
        baseColor = `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, 1)`;
        drawColorBlock(true); 
        applySelectedColor(pixel[0], pixel[1], pixel[2]);
    } else {
        pickerX = x; pickerY = y;
        drawColorBlock(false); 
        const pixel = ctx.getImageData(x, y, 1, 1).data; 
        applySelectedColor(pixel[0], pixel[1], pixel[2]);
        drawColorBlock(true);
    }
}

function handleMouseMove(e, ctx, canvas, isStrip) {
    const clientX = e.clientX, clientY = e.clientY;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(() => pickColor(clientX, clientY, ctx, canvas, isStrip));
}

colorBlock.addEventListener('mousedown', (e) => { isPickingBlock = true; pickColor(e.clientX, e.clientY, blockCtx, colorBlock, false); });
colorStrip.addEventListener('mousedown', (e) => { isPickingStrip = true; pickColor(e.clientX, e.clientY, stripCtx, colorStrip, true); });

window.addEventListener('mousemove', (e) => { 
    if (isPickingBlock) handleMouseMove(e, blockCtx, colorBlock, false); 
    if (isPickingStrip) handleMouseMove(e, stripCtx, colorStrip, true); 
});

window.addEventListener('mouseup', () => { 
    isPickingBlock = false; isPickingStrip = false; 
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
});

function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0, s = (max === 0 ? 0 : d / max), v = max;
    if (max !== min) {
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else if (max === b) h = (r - g) / d + 4;
        h /= 6;
    }
    return { h: h * 360, s: s, v: v };
}

[document.getElementById('slider-r'), document.getElementById('slider-g'), document.getElementById('slider-b')].forEach(slider => {
    slider.addEventListener('input', () => {
        const r = parseInt(document.getElementById('slider-r').value);
        const g = parseInt(document.getElementById('slider-g').value);
        const b = parseInt(document.getElementById('slider-b').value);
        
        applySelectedColor(r, g, b);
        const hsv = rgbToHsv(r, g, b);
        baseColor = `hsl(${hsv.h}, 100%, 50%)`; 
        pickerX = hsv.s * colorBlock.width;
        pickerY = (1 - hsv.v) * colorBlock.height;
        drawColorBlock();
    });
});

// 同步更新調色盤 UI 的小幫手
function updateColorPickerUI(r, g, b) {
    const hsv = rgbToHsv(r, g, b);
    baseColor = `hsl(${hsv.h}, 100%, 50%)`; 
    pickerX = hsv.s * colorBlock.width;
    pickerY = (1 - hsv.v) * colorBlock.height;
    drawColorBlock(true);
}

// ==========================================
// 6. 系統按鈕與圖層管理 (System & Layers)
// ==========================================
document.getElementById('btn-refresh').addEventListener('click', () => {
    saveState();
    contexts.forEach((ctx, idx) => ctx.clearRect(0, 0, canvases[idx].width, canvases[idx].height));
});

document.getElementById('btn-undo').addEventListener('click', () => {
    if (undoStacks[activeLayerIndex].length > 0) {
        const currentState = currentCtx.getImageData(0, 0, canvases[activeLayerIndex].width, canvases[activeLayerIndex].height);
        redoStacks[activeLayerIndex].push(currentState);
        currentCtx.putImageData(undoStacks[activeLayerIndex].pop(), 0, 0);
    }
});

document.getElementById('btn-redo').addEventListener('click', () => {
    if (redoStacks[activeLayerIndex].length > 0) {
        const currentState = currentCtx.getImageData(0, 0, canvases[activeLayerIndex].width, canvases[activeLayerIndex].height);
        undoStacks[activeLayerIndex].push(currentState);
        currentCtx.putImageData(redoStacks[activeLayerIndex].pop(), 0, 0);
    }
});

const layerItems = document.querySelectorAll('.layer-item');
layerItems.forEach(item => {
    item.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        layerItems.forEach(li => li.classList.remove('active'));
        item.classList.add('active');
        activeLayerIndex = parseInt(item.dataset.layer);
        currentCtx = contexts[activeLayerIndex];
    });

    const visBtn = item.querySelector('.btn-toggle-vis');
    visBtn.addEventListener('click', () => {
        const layerIdx = parseInt(item.dataset.layer);
        if (canvases[layerIdx].style.display === 'none') {
            canvases[layerIdx].style.display = 'block';
            visBtn.innerText = '👁️';
        } else {
            canvases[layerIdx].style.display = 'none';
            visBtn.innerText = '🙈';
        }
    });

    const clearBtn = item.querySelector('.btn-clear-layer');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            saveState(); 
            const layerIdx = parseInt(item.dataset.layer);
            contexts[layerIdx].clearRect(0, 0, canvases[layerIdx].width, canvases[layerIdx].height);
        });
    }
});

// ==========================================
// 臨時圖片編輯器系統 (Image Editor Mode)
// ==========================================
function initImageEditor(img) {
    const container = document.getElementById('canvas-container');
    const overlay = document.createElement('div');
    overlay.className = 'img-edit-overlay';
    
    // 1. 設定初始大小與位置 (限制最大尺寸並置中)
    let w = img.width, h = img.height;
    const maxW = container.clientWidth * 0.7; // 最大不超過畫布 70%
    const maxH = container.clientHeight * 0.7;
    if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w *= ratio;
        h *= ratio;
    }
    
    let x = (container.clientWidth - w) / 2;
    let y = (container.clientHeight - h) / 2;
    
    overlay.style.width = `${w}px`;
    overlay.style.height = `${h}px`;
    overlay.style.left = `${x}px`;
    overlay.style.top = `${y}px`;

    // 2. 建立 DOM 元素
    const imgEl = document.createElement('img');
    imgEl.src = img.src;
    overlay.appendChild(imgEl);

    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    overlay.appendChild(handle);

    const btn = document.createElement('button');
    btn.className = 'img-confirm-btn';
    btn.innerText = '✔️ 完成 (Enter)';
    overlay.appendChild(btn);

    container.appendChild(overlay);

    // 3. 拖曳與縮放狀態變數
    let isDragging = false;
    let isResizing = false;
    let startX, startY, startW, startH, startLeft, startTop;

    // 觸發拖曳
    overlay.addEventListener('mousedown', (e) => {
        if (e.target === handle || e.target === btn) return; // 點擊縮放點或按鈕時不觸發拖曳
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = overlay.offsetLeft;
        startTop = overlay.offsetTop;
        e.stopPropagation();
    });

    // 觸發縮放
    handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startW = overlay.offsetWidth;
        startH = overlay.offsetHeight;
        e.stopPropagation();
    });

    // 滑鼠移動 (全域監聽避免滑太快掉幀)
    const onMouseMove = (e) => {
        if (isDragging) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            overlay.style.left = `${startLeft + dx}px`;
            overlay.style.top = `${startTop + dy}px`;
        } else if (isResizing) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            let newW = startW + dx;
            let newH = startH + dy;
            
            // 按住 Ctrl 等比例縮放
            if (e.ctrlKey) {
                const ratio = startW / startH;
                newH = newW / ratio;
            }
            
            overlay.style.width = `${Math.max(20, newW)}px`; // 限制最小寬度 20px
            overlay.style.height = `${Math.max(20, newH)}px`;
        }
    };

    const onMouseUp = () => {
        isDragging = false;
        isResizing = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // 4. 確認並繪製到真正的 Canvas 上
    const confirmEdit = () => {
        saveState(); // 存檔支援 Undo
        
        const finalX = overlay.offsetLeft;
        const finalY = overlay.offsetTop;
        const finalW = overlay.offsetWidth;
        const finalH = overlay.offsetHeight;
        
        currentCtx.drawImage(img, finalX, finalY, finalW, finalH);
        
        // 清理 DOM 與事件監聽
        overlay.remove();
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('keydown', onKeyDown);
        
        // 自動切回游標工具
        document.getElementById('btn-cursor').click();
    };

    btn.addEventListener('click', confirmEdit);

    // 支援按 Enter 鍵快速確認
    const onKeyDown = (e) => {
        if (e.key === 'Enter') confirmEdit();
    };
    document.addEventListener('keydown', onKeyDown);
}

// ==========================================
// 7. 下載功能 (Download)
// ==========================================
document.getElementById('btn-download').addEventListener('click', () => {
    // 1. 建立一個臨時的畫布來合併所有圖層與背景
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvases[0].width;
    tempCanvas.height = canvases[0].height;
    const tempCtx = tempCanvas.getContext('2d');

    // 2. 填滿白色背景 (滿足 The background should not be transparent 的需求)
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // 3. 依序將所有「顯示中」的圖層畫到臨時畫布上
    // 注意圖層順序：layer0 (底層) -> layer1 (頂層)
    canvases.forEach(canvas => {
        // 只有當圖層沒有被隱藏時才畫上去 (配合眼睛 icon 的功能)
        if (canvas.style.display !== 'none') {
            tempCtx.drawImage(canvas, 0, 0);
        }
    });

    // 4. 將臨時畫布轉換為圖片 Data URL (預設為 PNG 格式)
    const dataURL = tempCanvas.toDataURL('image/png');

    // 5. 建立一個隱藏的 <a> 標籤來觸發瀏覽器下載
    const link = document.createElement('a');
    link.download = 'my_canvas_art.png'; // 下載的預設檔名
    link.href = dataURL;
    
    // 將 <a> 標籤加入 DOM、觸發點擊，然後立刻移除以保持乾淨
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// ==========================================
// 8. 畫布變形系統 (Resize & Rotate)
// ==========================================
document.getElementById('btn-resize').addEventListener('click', () => {
    const newW = parseInt(document.getElementById('input-width').value);
    const newH = parseInt(document.getElementById('input-height').value);
    if (newW <= 0 || newH <= 0) return;

    saveState(); 

    // 1. 暫存所有圖層當前的畫面
    const savedLayers = canvases.map(c => {
        const temp = document.createElement('canvas');
        temp.width = c.width; temp.height = c.height;
        temp.getContext('2d').drawImage(c, 0, 0);
        return temp;
    });

    // 2. 更新容器與背景的 CSS 大小
    container.style.width = `${newW}px`;
    container.style.height = `${newH}px`;
    
    // 如果你有 temp-canvas，也需要一起改
    const tempCanvas = document.getElementById('temp-canvas');
    if(tempCanvas) { tempCanvas.width = newW; tempCanvas.height = newH; }

    // 3. 更新實際 Canvas 大小，並將暫存的圖層畫回去
    canvases.forEach((c, idx) => {
        c.width = newW;
        c.height = newH;
        contexts[idx].drawImage(savedLayers[idx], 0, 0);
    });
});

document.getElementById('btn-rotate').addEventListener('click', () => {
    saveState();

    const oldW = canvases[0].width;
    const oldH = canvases[0].height;
    const newW = oldH; // 寬高互換
    const newH = oldW;

    // 同步更新上方的 Input 數值
    document.getElementById('input-width').value = newW;
    document.getElementById('input-height').value = newH;

    // 1. 暫存所有圖層
    const savedLayers = canvases.map(c => {
        const temp = document.createElement('canvas');
        temp.width = c.width; temp.height = c.height;
        temp.getContext('2d').drawImage(c, 0, 0);
        return temp;
    });

    // 2. 更新容器尺寸
    container.style.width = `${newW}px`;
    container.style.height = `${newH}px`;
    
    const tempCanvas = document.getElementById('temp-canvas');
    if(tempCanvas) { tempCanvas.width = newW; tempCanvas.height = newH; }

    // 3. 變更畫布尺寸並進行旋轉重繪
    canvases.forEach((c, idx) => {
        c.width = newW;
        c.height = newH;
        
        const ctx = contexts[idx];
        ctx.save();
        
        // 將原點移動到右上角，然後順時針旋轉 90 度 (PI / 2)
        ctx.translate(newW, 0);
        ctx.rotate(Math.PI / 2);
        
        // 畫上舊的影像 (此時的座標系是旋轉過的)
        ctx.drawImage(savedLayers[idx], 0, 0);
        ctx.restore();
    });
});