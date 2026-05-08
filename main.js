// Constants
const MASTERS_DEFAULTS = {
    registration: {
        titles: ["全景写真", "全景写真（遠景）", "屋根", "厨房設備", "浴室設備", "トイレ", "１階トイレ", "２階トイレ", "階段上り口", "階段下り口", "２階部屋", "バルコニー", "吹き抜け"],
        remarks: ["北側から撮影", "北東側から撮影", "東側から撮影", "南東側から撮影", "南側から撮影", "南西側から撮影", "西側から撮影", "北西側から撮影"]
    },
    boundary: {
        titles: [
            "準拠点 T1", "準拠点 T2", "準拠点 T3", "準拠点 T4", "準拠点 T5", "準拠点 T6", "準拠点 T7", "準拠点 T8", "準拠点 T9", "準拠点 T10",
            "境界点 K1", "境界点 K2", "境界点 K3", "境界点 K4", "境界点 K5", "境界点 K6", "境界点 K7", "境界点 K8", "境界点 K9", "境界点 K10",
            "分筆点 B1", "分筆点 B2", "分筆点 B3", "分筆点 B4", "分筆点 B5", "分筆点 B6", "分筆点 B7", "分筆点 B8", "分筆点 B9", "分筆点 B10"
        ],
        types: ["境界プレート", "金属鋲", "プラスチック杭", "プラスチック杭＋金属鋲", "コンクリート杭", "木杭", "真鍮鋲"],
        installations: ["新設", "既存", "復元", "入替え"],
        remarks: ["関係者が異議なく確認した。", "関係者が異議なく確認した。申請人が図面および現地にて分筆線を確認した。"]
    },
    section: {
        titles: [
            "1-1’断面", "2-2’断面", "3-3’断面", "4-4’断面", "5-5’断面", "6-6’断面", "7-7’断面", "8-8’断面", "9-9’断面", "10-10’断面",
            "1’-1断面", "2’-2断面", "3’-3断面", "4’-4断面", "5’-5断面", "6’-6断面", "7’-7断面", "8’-8断面", "9’-9断面", "10’-10断面"
        ],
        remarks: ["断面図と反対向きから撮影"]
    }
};

const MAX_IMAGE_WIDTH = 1200;

// State
let state = {
    currentMode: null, // 'registration', 'boundary', 'section'
    photos: [],
    masters: JSON.parse(localStorage.getItem('photobook_masters')) || MASTERS_DEFAULTS
};

// DOM Elements
const elements = {
    modeSelection: document.getElementById('mode-selection'),
    masterSettingsScreen: document.getElementById('master-settings-screen'),
    emptyState: document.getElementById('empty-state'),
    photoListContainer: document.getElementById('photo-list-container'),
    imageInput: document.getElementById('image-input'),
    imageInputAppend: document.getElementById('image-input-append'),
    photoList: document.getElementById('photo-list'),
    photoCount: document.getElementById('photo-count'),
    currentModeLabel: document.getElementById('current-mode-label'),
    generatePdfBtn: document.getElementById('generate-pdf-btn'),
    backToModes: document.getElementById('back-to-modes'),
    backToUpload: document.getElementById('back-to-upload'),
    backToModesFromSettings: document.getElementById('back-to-modes-from-settings'),
    closeSettingsBtn: document.getElementById('close-settings-btn'),
    settingsModeLabel: document.getElementById('settings-mode-label'),
    settingsTabs: document.getElementById('settings-tabs'),
    newMasterInput: document.getElementById('new-master-input'),
    addMasterBtn: document.getElementById('add-master-btn'),
    masterSettingsList: document.getElementById('master-settings-list'),
    masterBtn: document.getElementById('master-btn'),
    masterModal: document.getElementById('master-modal'),
    selectionModal: document.getElementById('selection-modal'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text')
};

// Current settings tab state
state.currentSettingsTab = 'titles';

// Initialize
function init() {
    lucide.createIcons();
    setupEventListeners();
    
    // Setup Sortable
    new Sortable(elements.photoList, {
        animation: 150,
        handle: '.drag-handle',
        onEnd: () => {
            const reorderedIds = Array.from(elements.photoList.children).map(child => child.dataset.id);
            state.photos = reorderedIds.map(id => state.photos.find(p => p.id === id));
        }
    });
}

function setupEventListeners() {
    // Mode selection
    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => {
            state.currentMode = card.dataset.mode;
            showUploadScreen();
        });
    });

    elements.backToModesFromSettings.addEventListener('click', () => {
        elements.masterSettingsScreen.classList.add('hidden');
        if (state.photos.length > 0) {
            updateUI();
        } else {
            showUploadScreen();
        }
    });

    elements.closeSettingsBtn.addEventListener('click', () => {
        elements.masterSettingsScreen.classList.add('hidden');
        if (state.photos.length > 0) {
            updateUI();
        } else {
            showUploadScreen();
        }
    });

    elements.addMasterBtn.addEventListener('click', () => {
        const val = elements.newMasterInput.value.trim();
        if (!val) return;
        state.masters[state.currentMode][state.currentSettingsTab].push(val);
        localStorage.setItem('photobook_masters', JSON.stringify(state.masters));
        elements.newMasterInput.value = '';
        renderMasterSettingsList();
    });

    elements.backToModes.addEventListener('click', () => {
        state.currentMode = null;
        state.photos = [];
        showModeSelection();
    });

    elements.backToUpload.addEventListener('click', () => {
        state.photos = [];
        showUploadScreen();
    });

    elements.imageInput.addEventListener('change', handleImageSelect);
    elements.imageInputAppend.addEventListener('change', handleImageSelect);
    
    elements.generatePdfBtn.addEventListener('click', generatePDF);
    
    elements.masterBtn.addEventListener('click', () => {
        if (!state.currentMode) {
            alert('先に写真帳の様式を選択してください。');
        } else {
            showMasterSettingsScreen();
        }
    });
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.selectionModal.classList.add('hidden');
        });
    });
}

function showModeSelection() {
    elements.modeSelection.classList.remove('hidden');
    elements.masterSettingsScreen.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
    elements.photoListContainer.classList.add('hidden');
    elements.masterBtn.classList.add('hidden');
}

const MODE_NAMES = {
    'registration': '登記用写真帳',
    'boundary': '準拠点・境界点用',
    'section': '断面用写真帳'
};

function showMasterSettingsScreen() {
    elements.modeSelection.classList.add('hidden');
    elements.masterSettingsScreen.classList.remove('hidden');
    elements.emptyState.classList.add('hidden');
    elements.photoListContainer.classList.add('hidden');
    elements.masterBtn.classList.add('hidden');
    
    state.currentSettingsTab = 'titles'; // Reset tab when opened
    elements.settingsModeLabel.textContent = MODE_NAMES[state.currentMode];
    renderMasterSettingsTabs();
}

function renderMasterSettingsTabs() {
    const modeMasters = state.masters[state.currentMode];
    const keys = Object.keys(modeMasters);
    
    const LABELS = { titles: 'タイトル', remarks: '備考', types: '境界標の種類', installations: '設置種別' };
    
    elements.settingsTabs.innerHTML = keys.map(key => `
        <button class="tab-btn ${state.currentSettingsTab === key ? 'active' : ''}" data-tab="${key}">${LABELS[key]}</button>
    `).join('');

    elements.settingsTabs.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.currentSettingsTab = btn.dataset.tab;
            renderMasterSettingsTabs(); // Refresh active state
        });
    });

    renderMasterSettingsList();
}

function renderMasterSettingsList() {
    const list = state.masters[state.currentMode][state.currentSettingsTab];
    elements.masterSettingsList.innerHTML = list.map((item, index) => `
        <li class="master-item">
            <span>${item}</span>
            <button class="icon-btn" onclick="deleteMasterItem(${index})"><i data-lucide="trash-2" style="color:var(--danger)"></i></button>
        </li>
    `).join('');
    lucide.createIcons();
}

window.deleteMasterItem = (index) => {
    state.masters[state.currentMode][state.currentSettingsTab].splice(index, 1);
    localStorage.setItem('photobook_masters', JSON.stringify(state.masters));
    renderMasterSettingsList();
};

function showUploadScreen() {
    elements.modeSelection.classList.add('hidden');
    elements.masterSettingsScreen.classList.add('hidden');
    elements.emptyState.classList.remove('hidden');
    elements.photoListContainer.classList.add('hidden');
    elements.masterBtn.classList.remove('hidden');
    
    document.getElementById('empty-state-title').textContent = `${MODE_NAMES[state.currentMode]}の写真を読み込んでください`;
}

// Image Handling
async function handleImageSelect(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    showLoading('画像を処理中...');
    
    for (const file of files) {
        try {
            const photoData = await processImage(file);
            state.photos.push(photoData);
        } catch (err) {
            console.error('Error processing image:', err);
        }
    }

    updateUI();
    hideLoading();
    e.target.value = '';
}

async function processImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const img = new Image();
            img.onload = async () => {
                let date = '';
                try {
                    await new Promise((res) => {
                        EXIF.getData(file, function() {
                            const exifDate = EXIF.getTag(this, "DateTimeOriginal");
                            if (exifDate) {
                                date = exifDate.split(' ')[0].replace(/:/g, '-');
                            }
                            res();
                        });
                    });
                } catch (exifErr) { console.warn('Exif read failed', exifErr); }

                if (!date) {
                    const d = new Date(file.lastModified);
                    date = d.toISOString().split('T')[0];
                }

                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > MAX_IMAGE_WIDTH) {
                    height = (MAX_IMAGE_WIDTH / width) * height;
                    width = MAX_IMAGE_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

                const modeMasters = state.masters[state.currentMode];
                resolve({
                    id: Math.random().toString(36).substr(2, 9),
                    src: compressedDataUrl,
                    title: modeMasters.titles[0] || '',
                    remarks: modeMasters.remarks[0] || '',
                    type: modeMasters.types ? modeMasters.types[0] : '',
                    installation: modeMasters.installations ? modeMasters.installations[0] : '',
                    date: date || new Date().toISOString().split('T')[0]
                });
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function updateUI() {
    if (state.photos.length > 0) {
        elements.emptyState.classList.add('hidden');
        elements.photoListContainer.classList.remove('hidden');
        elements.photoCount.textContent = `${state.photos.length}枚の写真`;
        
        const modeLabels = {
            'registration': '登記用',
            'boundary': '準拠点・境界点',
            'section': '断面用'
        };
        elements.currentModeLabel.textContent = modeLabels[state.currentMode];
        elements.masterBtn.classList.remove('hidden');
    }
    renderPhotoList();
}

function renderPhotoList() {
    elements.photoList.innerHTML = '';
    state.photos.forEach(photo => {
        const card = document.createElement('div');
        card.className = `photo-card ${state.currentMode}-card`;
        card.dataset.id = photo.id;
        
        let infoHtml = '';
        if (state.currentMode === 'registration') {
            infoHtml = `
                <div class="info-row">
                    <span class="label">タイトル</span>
                    <div class="select-field" onclick="showSelectionModal('${photo.id}', 'titles')">
                        <span id="title-${photo.id}">${photo.title}</span>
                        <i data-lucide="chevron-down"></i>
                    </div>
                </div>
                <div class="info-row">
                    <span class="label">撮影年月日</span>
                    <input type="date" class="date-input" value="${photo.date}" onchange="updatePhotoData('${photo.id}', 'date', this.value)">
                </div>
                <div class="info-row">
                    <span class="label">備考</span>
                    <div class="select-field" onclick="showSelectionModal('${photo.id}', 'remarks')">
                        <span id="remarks-${photo.id}">${photo.remarks}</span>
                        <i data-lucide="chevron-down"></i>
                    </div>
                </div>
            `;
        } else if (state.currentMode === 'boundary') {
            infoHtml = `
                <div class="info-row-group">
                    <div class="info-row">
                        <span class="label">タイトル</span>
                        <div class="select-field" onclick="showSelectionModal('${photo.id}', 'titles')">
                            <span id="title-${photo.id}">${photo.title}</span>
                            <i data-lucide="chevron-down"></i>
                        </div>
                    </div>
                    <div class="info-row">
                        <span class="label">境界標の種類</span>
                        <div class="select-field" onclick="showSelectionModal('${photo.id}', 'types')">
                            <span id="types-${photo.id}">${photo.type}</span>
                            <i data-lucide="chevron-down"></i>
                        </div>
                    </div>
                    <div class="info-row">
                        <span class="label">設置種別</span>
                        <div class="select-field" onclick="showSelectionModal('${photo.id}', 'installations')">
                            <span id="installations-${photo.id}">${photo.installation}</span>
                            <i data-lucide="chevron-down"></i>
                        </div>
                    </div>
                </div>
                <div class="info-row">
                    <span class="label">撮影年月日</span>
                    <input type="date" class="date-input" value="${photo.date}" onchange="updatePhotoData('${photo.id}', 'date', this.value)">
                </div>
                <div class="info-row">
                    <span class="label">備考</span>
                    <div class="select-field" onclick="showSelectionModal('${photo.id}', 'remarks')">
                        <span id="remarks-${photo.id}">${photo.remarks}</span>
                        <i data-lucide="chevron-down"></i>
                    </div>
                </div>
            `;
        } else if (state.currentMode === 'section') {
            infoHtml = `
                <div class="info-row">
                    <span class="label">タイトル</span>
                    <div class="select-field" onclick="showSelectionModal('${photo.id}', 'titles')">
                        <span id="title-${photo.id}">${photo.title}</span>
                        <i data-lucide="chevron-down"></i>
                    </div>
                </div>
                <div class="info-row">
                    <span class="label">備考</span>
                    <textarea class="remarks-textarea" onchange="updatePhotoData('${photo.id}', 'remarks', this.value)" rows="4" onclick="event.stopPropagation()">${photo.remarks}</textarea>
                    <div class="select-field-small" onclick="showSelectionModal('${photo.id}', 'remarks')">
                        <span>定型文から選択</span>
                        <i data-lucide="chevron-down"></i>
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="photo-card-header">
                <div class="drag-handle"><i data-lucide="grip-vertical"></i></div>
                <button class="remove-photo" onclick="removePhoto('${photo.id}')"><i data-lucide="x"></i></button>
            </div>
            <div class="card-body-layout">
                <img src="${photo.src}" class="photo-preview">
                <div class="photo-info">${infoHtml}</div>
            </div>
        `;
        elements.photoList.appendChild(card);
    });
    lucide.createIcons();
}

window.removePhoto = (id) => {
    state.photos = state.photos.filter(p => p.id !== id);
    updateUI();
};

window.updatePhotoData = (id, field, value) => {
    const photo = state.photos.find(p => p.id === id);
    if (photo) photo[field] = value;
};

window.showSelectionModal = (photoId, type) => {
    const photo = state.photos.find(p => p.id === photoId);
    const options = state.masters[state.currentMode][type];
    if (!options) return;

    let currentVal = photo.title;
    if (type === 'remarks') currentVal = photo.remarks;
    if (type === 'types') currentVal = photo.type;
    if (type === 'installations') currentVal = photo.installation;
    
    const titles = { titles: 'タイトル', remarks: '備考', types: '境界標の種類', installations: '設置種別' };
    document.getElementById('selection-title').textContent = `${titles[type]}を選択`;
    
    const container = document.getElementById('selection-options');
    container.innerHTML = options.map(opt => `
        <div class="selection-option ${opt === currentVal ? 'selected' : ''}" onclick="selectOption('${photoId}', '${type}', '${opt.replace(/'/g, "\\'")}')">
            ${opt}
        </div>
    `).join('');
    elements.selectionModal.classList.remove('hidden');
};

window.selectOption = (photoId, type, value) => {
    const photo = state.photos.find(p => p.id === photoId);
    if (photo) {
        if (type === 'titles') photo.title = value;
        else if (type === 'remarks') photo.remarks = value;
        else if (type === 'types') photo.type = value;
        else if (type === 'installations') photo.installation = value;
    }
    elements.selectionModal.classList.add('hidden');
    renderPhotoList();
};

// PDF Generation
async function generatePDF() {
    if (state.photos.length === 0) return;
    showLoading('PDFを生成中...');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

        // Text Helper with Wrapping
        const textToImg = (text, w, h, fontSize = 10, align = 'left', vertical = false) => {
            const canvas = document.createElement('canvas');
            const scale = 4;
            canvas.width = w * scale;
            canvas.height = h * scale;
            const ctx = canvas.getContext('2d');
            ctx.scale(scale, scale);
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 0.2;
            ctx.strokeRect(0, 0, w, h);
            ctx.fillStyle = '#333';
            const fontSizePx = fontSize * 25.4 / 72;
            ctx.font = `${fontSizePx}px "Noto Sans JP", sans-serif`;
            
            if (vertical) {
                ctx.save();
                ctx.translate(w / 2, h / 2);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const chars = text.split('');
                const charH = fontSizePx * 1.1;
                chars.forEach((c, i) => {
                    ctx.fillText(c, 0, (i - (chars.length - 1) / 2) * charH);
                });
                ctx.restore();
            } else {
                ctx.textBaseline = 'top';
                const padding = 2;
                const lineHeight = fontSizePx * 1.4;
                const maxWidth = w - padding * 2;
                
                if (align === 'center') {
                    ctx.textAlign = 'center';
                    ctx.fillText(text, w / 2, padding);
                } else {
                    ctx.textAlign = 'left';
                    // Basic wrapping logic
                    const words = text.split(''); // For Japanese, split by character
                    let line = '';
                    let y = padding;
                    for (let n = 0; n < words.length; n++) {
                        let testLine = line + words[n];
                        let metrics = ctx.measureText(testLine);
                        if (metrics.width > maxWidth && n > 0) {
                            ctx.fillText(line, padding, y);
                            line = words[n];
                            y += lineHeight;
                        } else {
                            line = testLine;
                        }
                    }
                    ctx.fillText(line, padding, y);
                }
            }
            return canvas.toDataURL('image/jpeg', 0.9);
        };

        if (state.currentMode === 'registration') {
            const PHOTO_W = 84.4, PHOTO_H = 63.3, BOX_H = 6, COL_GAP = 10, ROW_GAP = 12;
            const MX = (210 - (PHOTO_W * 2 + COL_GAP)) / 2, MY = 20;
            for (let i = 0; i < state.photos.length; i++) {
                if (i > 0 && i % 6 === 0) doc.addPage();
                const p = i % 6, col = p % 2, row = Math.floor(p / 2);
                const x = MX + col * (PHOTO_W + COL_GAP), y = MY + row * (PHOTO_H + BOX_H * 3 + ROW_GAP);
                const photo = state.photos[i];
                doc.addImage(textToImg(photo.title, PHOTO_W, BOX_H), 'JPEG', x, y, PHOTO_W, BOX_H);
                doc.addImage(photo.src, 'JPEG', x, y + BOX_H, PHOTO_W, PHOTO_H);
                doc.rect(x, y + BOX_H, PHOTO_W, PHOTO_H);
                doc.addImage(textToImg(`撮影日: ${photo.date}`, PHOTO_W, BOX_H), 'JPEG', x, y + BOX_H + PHOTO_H, PHOTO_W, BOX_H);
                doc.addImage(textToImg(photo.remarks, PHOTO_W, BOX_H), 'JPEG', x, y + BOX_H + PHOTO_H + BOX_H, PHOTO_W, BOX_H);
            }
        } else if (state.currentMode === 'boundary') {
            const PHOTO_W = 92, PHOTO_H = 69, LABEL_W = 5, TOP_BOX_H = 7, BTM_BOX_H = 6;
            const COL_GAP = 6, ROW_GAP = 12;
            const TOTAL_W = (PHOTO_W + LABEL_W) * 2 + COL_GAP;
            const MX = (210 - TOTAL_W) / 2, MY = 15;
            for (let i = 0; i < state.photos.length; i++) {
                if (i > 0 && i % 6 === 0) doc.addPage();
                const p = i % 6, col = p % 2, row = Math.floor(p / 2);
                const x = MX + col * (PHOTO_W + LABEL_W + COL_GAP/2) + (col === 1 ? COL_GAP/2 : 0);
                const y = MY + row * (PHOTO_H + TOP_BOX_H + BTM_BOX_H * 2 + ROW_GAP);
                const photo = state.photos[i];
                const topText = `${photo.title}  ${photo.type}  ${photo.installation}`;
                doc.addImage(textToImg(topText, PHOTO_W, TOP_BOX_H, 9), 'JPEG', x + (col === 1 ? 0 : LABEL_W), y, PHOTO_W, TOP_BOX_H);
                const px = x + (col === 1 ? 0 : LABEL_W), py = y + TOP_BOX_H;
                doc.addImage(photo.src, 'JPEG', px, py, PHOTO_W, PHOTO_H);
                doc.rect(px, py, PHOTO_W, PHOTO_H);
                const labelX = col === 0 ? x : x + PHOTO_W;
                const labelText = col === 0 ? "遠　景" : "近　景";
                doc.addImage(textToImg(labelText, LABEL_W, PHOTO_H, 10, 'center', true), 'JPEG', labelX, py, LABEL_W, PHOTO_H);
                doc.addImage(textToImg(`撮影年月日: ${photo.date}`, PHOTO_W, BTM_BOX_H, 9), 'JPEG', px, py + PHOTO_H, PHOTO_W, BTM_BOX_H);
                doc.addImage(textToImg(photo.remarks, PHOTO_W, BTM_BOX_H, 9), 'JPEG', px, py + PHOTO_H + BTM_BOX_H, PHOTO_W, BTM_BOX_H);
            }
        } else if (state.currentMode === 'section') {
            const PHOTO_W = 96, PHOTO_H = 72, BOX_H = 8, REMARK_W = 80, GAP = 10;
            const MX = 15, MY = 20;
            for (let i = 0; i < state.photos.length; i++) {
                if (i > 0 && i % 3 === 0) doc.addPage();
                const p = i % 3, y = MY + p * (PHOTO_H + BOX_H + GAP);
                const photo = state.photos[i];
                doc.addImage(textToImg(photo.title, PHOTO_W, BOX_H, 11), 'JPEG', MX, y, PHOTO_W, BOX_H);
                doc.addImage(photo.src, 'JPEG', MX, y + BOX_H, PHOTO_W, PHOTO_H);
                doc.rect(MX, y + BOX_H, PHOTO_W, PHOTO_H);
                const remarkH = PHOTO_H + BOX_H;
                doc.addImage(textToImg(photo.remarks, REMARK_W, remarkH, 10), 'JPEG', MX + PHOTO_W + 5, y, REMARK_W, remarkH);
            }
        }
        const n = new Date();
        const ts = `${n.getFullYear()}${String(n.getMonth()+1).padStart(2,'0')}${String(n.getDate()).padStart(2,'0')}_${String(n.getHours()).padStart(2,'0')}${String(n.getMinutes()).padStart(2,'0')}`;
        doc.save(`PhotoBook_${ts}.pdf`);
    } catch (err) { alert('PDF生成失敗'); console.error(err); } finally { hideLoading(); }
}

function showLoading(t) { elements.loadingText.textContent = t; elements.loadingOverlay.classList.remove('hidden'); }
function hideLoading() { elements.loadingOverlay.classList.add('hidden'); }
init();
