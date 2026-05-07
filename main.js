// Constants
const DEFAULT_TITLES = ["全景写真", "全景写真（遠景）", "屋根", "厨房設備", "浴室設備", "トイレ", "１階トイレ", "２階トイレ", "階段上り口", "階段下り口", "２階部屋", "バルコニー", "吹き抜け"];
const DEFAULT_REMARKS = ["北側から撮影", "北東側から撮影", "東側から撮影", "南東側から撮影", "南側から撮影", "南西側から撮影", "西側から撮影", "北西側から撮影"];
const MAX_IMAGE_WIDTH = 1200; // Optimization: Max width for compressed images

// State
let state = {
    photos: [],
    masters: {
        titles: JSON.parse(localStorage.getItem('masters_titles')) || DEFAULT_TITLES,
        remarks: JSON.parse(localStorage.getItem('masters_remarks')) || DEFAULT_REMARKS
    }
};

// DOM Elements
const elements = {
    imageInput: document.getElementById('image-input'),
    imageInputAppend: document.getElementById('image-input-append'),
    photoList: document.getElementById('photo-list'),
    emptyState: document.getElementById('empty-state'),
    photoListContainer: document.getElementById('photo-list-container'),
    photoCount: document.getElementById('photo-count'),
    generatePdfBtn: document.getElementById('generate-pdf-btn'),
    masterBtn: document.getElementById('master-btn'),
    masterModal: document.getElementById('master-modal'),
    selectionModal: document.getElementById('selection-modal'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text'),
    titleList: document.getElementById('title-list'),
    remarkList: document.getElementById('remark-list'),
    newTitleInput: document.getElementById('new-title'),
    newRemarkInput: document.getElementById('new-remark'),
    addTitleBtn: document.getElementById('add-title-btn'),
    addRemarkBtn: document.getElementById('add-remark-btn')
};

// Initialize
function init() {
    lucide.createIcons();
    setupEventListeners();
    renderMasterLists();
    
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
    elements.imageInput.addEventListener('change', handleImageSelect);
    elements.imageInputAppend.addEventListener('change', handleImageSelect);
    
    elements.generatePdfBtn.addEventListener('click', generatePDF);
    
    elements.masterBtn.addEventListener('click', () => showModal(elements.masterModal));
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.masterModal.classList.add('hidden');
            elements.selectionModal.classList.add('hidden');
        });
    });

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-tab`).classList.remove('hidden');
        });
    });

    elements.addTitleBtn.addEventListener('click', () => addMaster('titles', elements.newTitleInput));
    elements.addRemarkBtn.addEventListener('click', () => addMaster('remarks', elements.newRemarkInput));
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
    e.target.value = ''; // Reset input
}

async function processImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const img = new Image();
            img.onload = async () => {
                // Get Exif
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
                } catch (exifErr) {
                    console.warn('Exif read failed', exifErr);
                }

                if (!date) {
                    const d = new Date(file.lastModified);
                    date = d.toISOString().split('T')[0];
                }

                // Compress
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

                resolve({
                    id: Math.random().toString(36).substr(2, 9),
                    src: compressedDataUrl,
                    title: state.masters.titles[0] || '',
                    remarks: state.masters.remarks[0] || '',
                    date: date || new Date().toISOString().split('T')[0]
                });
            };
            img.onerror = () => reject(new Error('Image load failed'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsDataURL(file);
    });
}

// UI Rendering
function updateUI() {
    if (state.photos.length > 0) {
        elements.emptyState.classList.add('hidden');
        elements.photoListContainer.classList.remove('hidden');
        elements.photoCount.textContent = `${state.photos.length}枚の写真`;
    } else {
        elements.emptyState.classList.remove('hidden');
        elements.photoListContainer.classList.add('hidden');
    }

    renderPhotoList();
}

function renderPhotoList() {
    elements.photoList.innerHTML = '';
    state.photos.forEach(photo => {
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.dataset.id = photo.id;
        card.innerHTML = `
            <div class="photo-card-header">
                <div class="drag-handle"><i data-lucide="grip-vertical"></i></div>
                <button class="remove-photo" onclick="removePhoto('${photo.id}')">
                    <i data-lucide="x" style="width:14px;height:14px"></i>
                </button>
            </div>
            <img src="${photo.src}" class="photo-preview" onclick="previewImage('${photo.src}')">
            <div class="photo-info">
                <div class="info-row">
                    <span class="label">タイトル</span>
                    <div class="select-field" onclick="showSelectionModal('${photo.id}', 'titles')">
                        <span id="title-${photo.id}">${photo.title}</span>
                        <i data-lucide="chevron-down" style="width:16px"></i>
                    </div>
                </div>
                <div class="info-row">
                    <span class="label">撮影年月日</span>
                    <input type="date" class="date-input" value="${photo.date}" onchange="updatePhotoDate('${photo.id}', this.value)">
                </div>
                <div class="info-row">
                    <span class="label">備考</span>
                    <div class="select-field" onclick="showSelectionModal('${photo.id}', 'remarks')">
                        <span id="remarks-${photo.id}">${photo.remarks}</span>
                        <i data-lucide="chevron-down" style="width:16px"></i>
                    </div>
                </div>
            </div>
        `;
        elements.photoList.appendChild(card);
    });
    lucide.createIcons();
}

// Global functions for inline handlers
window.removePhoto = (id) => {
    state.photos = state.photos.filter(p => p.id !== id);
    updateUI();
};

window.updatePhotoDate = (id, date) => {
    const photo = state.photos.find(p => p.id === id);
    if (photo) photo.date = date;
};

window.previewImage = (src) => {
    // Simple preview or just do nothing for now
};

// Modal Logic
function showModal(modal) {
    modal.classList.remove('hidden');
}

function addMaster(type, input) {
    const val = input.value.trim();
    if (!val) return;
    state.masters[type].push(val);
    localStorage.setItem(`masters_${type}`, JSON.stringify(state.masters[type]));
    input.value = '';
    renderMasterLists();
}

window.deleteMaster = (type, index) => {
    state.masters[type].splice(index, 1);
    localStorage.setItem(`masters_${type}`, JSON.stringify(state.masters[type]));
    renderMasterLists();
};

function renderMasterLists() {
    elements.titleList.innerHTML = state.masters.titles.map((t, i) => `
        <li class="master-item">
            <span>${t}</span>
            <button class="icon-btn" onclick="deleteMaster('titles', ${i})"><i data-lucide="trash-2" style="width:16px;color:var(--danger)"></i></button>
        </li>
    `).join('');
    
    elements.remarkList.innerHTML = state.masters.remarks.map((r, i) => `
        <li class="master-item">
            <span>${r}</span>
            <button class="icon-btn" onclick="deleteMaster('remarks', ${i})"><i data-lucide="trash-2" style="width:16px;color:var(--danger)"></i></button>
        </li>
    `).join('');
    lucide.createIcons();
}

window.showSelectionModal = (photoId, type) => {
    const photo = state.photos.find(p => p.id === photoId);
    const options = state.masters[type === 'titles' ? 'titles' : 'remarks'];
    const currentVal = type === 'titles' ? photo.title : photo.remarks;
    
    document.getElementById('selection-title').textContent = type === 'titles' ? 'タイトルを選択' : '備考を選択';
    const container = document.getElementById('selection-options');
    container.innerHTML = options.map(opt => `
        <div class="selection-option ${opt === currentVal ? 'selected' : ''}" onclick="selectOption('${photoId}', '${type}', '${opt.replace(/'/g, "\\'")}')">
            ${opt}
        </div>
    `).join('');
    
    showModal(elements.selectionModal);
};

window.selectOption = (photoId, type, value) => {
    const photo = state.photos.find(p => p.id === photoId);
    if (photo) {
        if (type === 'titles') photo.title = value;
        else photo.remarks = value;
    }
    elements.selectionModal.classList.add('hidden');
    updateUI();
};

// PDF Generation with Japanese Support via Canvas
async function generatePDF() {
    if (state.photos.length === 0) return;
    
    showLoading('PDFを生成中...');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        // Strict Specs (mm)
        const PHOTO_W = 84.4;
        const PHOTO_H = 63.3;
        const BOX_H = 6; // Height for title/date/remark boxes
        const COL_GAP = 10;
        const ROW_GAP = 12; 
        
        // Calculate centered margins
        const MARGIN_X = (210 - (PHOTO_W * 2 + COL_GAP)) / 2;
        const MARGIN_Y = 20;

        // Helper: Render text to canvas and get data URL
        const textToImage = (text, width, height, fontSizePt = 10) => {
            const canvas = document.createElement('canvas');
            const scale = 4; // Higher resolution
            canvas.width = width * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext('2d');
            ctx.scale(scale, scale);
            
            // Draw background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            
            // Draw border
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(0, 0, width, height);
            
            // Convert pt to mm for logical sizing (1 pt = 25.4 / 72 mm)
            const fontSizeMm = fontSizePt * 25.4 / 72;
            
            // Draw text
            ctx.fillStyle = '#333333';
            ctx.font = `${fontSizeMm}px "Noto Sans JP", sans-serif`;
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 2, height / 2); // 2mm padding from left
            
            return canvas.toDataURL('image/jpeg', 0.9);
        };

        for (let i = 0; i < state.photos.length; i++) {
            const posInPage = i % 6;
            const col = posInPage % 2;
            const row = Math.floor(posInPage / 2);

            if (posInPage === 0 && i !== 0) {
                doc.addPage();
            }

            const x = MARGIN_X + col * (PHOTO_W + COL_GAP);
            const y = MARGIN_Y + row * (PHOTO_H + BOX_H * 3 + ROW_GAP);

            const photo = state.photos[i];

            // 1. Title Area
            const titleImg = textToImage(photo.title, PHOTO_W, BOX_H, 10);
            doc.addImage(titleImg, 'JPEG', x, y, PHOTO_W, BOX_H);

            // 2. Photo Area
            doc.addImage(photo.src, 'JPEG', x, y + BOX_H, PHOTO_W, PHOTO_H);
            // Draw border around photo
            doc.setDrawColor(204);
            doc.setLineWidth(0.1);
            doc.rect(x, y + BOX_H, PHOTO_W, PHOTO_H);

            // 3. Date Area
            const dateImg = textToImage(`撮影日: ${photo.date}`, PHOTO_W, BOX_H, 10);
            doc.addImage(dateImg, 'JPEG', x, y + BOX_H + PHOTO_H, PHOTO_W, BOX_H);

            // 4. Remarks Area
            const remarkImg = textToImage(photo.remarks, PHOTO_W, BOX_H, 10);
            doc.addImage(remarkImg, 'JPEG', x, y + BOX_H + PHOTO_H + BOX_H, PHOTO_W, BOX_H);
        }

        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        
        doc.save(`PhotoBook_${yyyy}${mm}${dd}_${hh}${min}${ss}.pdf`);
    } catch (err) {
        console.error('PDF Generation failed:', err);
        alert('PDF生成中にエラーが発生しました。詳細はコンソールを確認してください。');
    } finally {
        hideLoading();
    }
}

// Helpers
function showLoading(text) {
    elements.loadingText.textContent = text;
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

// Start app
init();
