let state = { ings: [], staples: [], plan: { days: [] }, ak: '', su: '' };

// Load Initial Data
const saved = localStorage.getItem('ftf_v2');
if (saved) {
    state = JSON.parse(saved);
    // Ensure backwards compatibility for staples if it was an object
    if (!Array.isArray(state.staples)) state.staples = [];
}

function sh(v) {
    document.querySelectorAll('.view, .tab').forEach(e => e.classList.remove('active'));
    document.getElementById('v-' + v).classList.add('active');
    document.getElementById('t-' + v).classList.add('active');
    if(v === 'ings') renderFridge();
    if(v === 'set') renderStapleTags();
    if(v === 'plan') renderMealPlan();
}

// --- FRIDGE LOGIC ---

function saveItem() {
    const idx = parseInt(document.getElementById('edit-idx').value);
    const newItem = {
        Item: document.getElementById('n').value.trim(),
        Qty: document.getElementById('q').value,
        Unit: document.getElementById('u').value,
        Category: document.getElementById('cat').value,
        Storage: document.getElementById('store').value,
        'Use By': document.getElementById('ub').value // HTML date input gives YYYY-MM-DD
    };

    if (!newItem.Item) return alert("Give it a name, mate.");

    if (idx === -1) {
        state.ings.push(newItem);
    } else {
        state.ings[idx] = newItem;
    }

    persist();
    resetForm();
    renderFridge();
    syncToSheet();
}

function editItem(idx) {
    const item = state.ings[idx];
    document.getElementById('edit-idx').value = idx;
    document.getElementById('n').value = item.Item;
    document.getElementById('q').value = item.Qty;
    document.getElementById('u').value = item.Unit;
    document.getElementById('cat').value = item.Category || 'Other';
    document.getElementById('store').value = item.Storage || 'Fridge';
    
    // Ensure date format is YYYY-MM-DD for the input
    if (item['Use By']) {
        const d = new Date(item['Use By']);
        document.getElementById('ub').value = d.toISOString().split('T')[0];
    }

    document.getElementById('editor-title').innerText = "Edit Item";
    document.getElementById('save-btn').innerText = "Update Item";
    document.getElementById('cancel-btn').style.display = "block";
    window.scrollTo(0,0);
}

function deleteItem(idx) {
    if(confirm("Delete this?")) {
        state.ings.splice(idx, 1);
        persist();
        renderFridge();
        syncToSheet();
    }
}

function resetForm() {
    document.getElementById('edit-idx').value = "-1";
    document.getElementById('n').value = "";
    document.getElementById('ub').value = "";
    document.getElementById('editor-title').innerText = "Add Item";
    document.getElementById('save-btn').innerText = "Save to Fridge";
    document.getElementById('cancel-btn').style.display = "none";
}

// --- SYNC LOGIC ---

async function syncAll() {
    if(!state.su) return alert("Add your Apps Script URL in settings first.");
    setStatus("Syncing...");
    try {
        const r = await fetch(state.su + "?action=pullAll&t=" + Date.now());
        const d = await r.json();
        state.ings = d.ingredients || [];
        state.staples = d.staples || [];
        if(d.plan) state.plan = d.plan;
        persist();
        sh('plan'); // Refresh view
    } catch(e) {
        console.error("Sync failed", e);
        alert("Couldn't pull data from Google Sheets.");
    }
    setStatus("Ready");
}

async function syncToSheet() {
    if(!state.su) return;
    setStatus("Saving...");
    try {
        // Using standard fetch - if you have CORS issues with GAS, 
        // ensure your GAS project has a proper 'doPost' that returns a text output
        await fetch(state.su, { 
            method: 'POST', 
            mode: 'no-cors', // Standard for GAS web apps unless using a proxy
            body: JSON.stringify({ action: 'pushAll', ...state }) 
        });
    } catch(e) { console.error("Push failed", e); }
    setStatus("Ready");
}

// --- UTILS ---

function persist() {
    localStorage.setItem('ftf_v2', JSON.stringify(state));
}

function setStatus(msg) {
    const s = document.getElementById('status');
    s.innerText = msg;
    s.className = msg === "Ready" ? "status-ready" : "status-busy";
}

function updateCredentials() {
    state.ak = document.getElementById('ak').value.trim();
    state.su = document.getElementById('su').value.trim();
    persist();
    alert("Saved. Try syncing now.");
}

// Initialize UI
document.getElementById('ak').value = state.ak || '';
document.getElementById('su').value = state.su || '';
sh('plan');