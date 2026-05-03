function renderFridge() {
    const list = document.getElementById('iList');
    if (!state.ings || state.ings.length === 0) {
        list.innerHTML = "<p style='text-align:center; opacity:0.5;'>The fridge is empty.</p>";
        return;
    }

    // Sort by Expiry (soonest first)
    const sorted = [...state.ings].sort((a, b) => {
        if (!a['Use By']) return 1;
        if (!b['Use By']) return -1;
        return new Date(a['Use By']) - new Date(b['Use By']);
    });

    list.innerHTML = sorted.map((item) => {
        const realIdx = state.ings.findIndex(i => i === item);
        const expiryInfo = getExpiryLabel(item['Use By']);
        
        return `
            <div class="ing-card" id="ing-row-${realIdx}">
                <div class="ing-item">
                    <div onclick="showInlineEdit(${realIdx})" style="cursor:pointer; flex:1;">
                        <div style="font-weight:700;">${item.Item}</div>
                        <div class="ing-meta">${item.Qty} ${item.Unit} • ${item.Category}</div>
                        ${expiryInfo}
                    </div>
                    <button class="btn btn-s" style="width:auto; color:var(--warn); border:none;" onclick="deleteItem(${realIdx})">✕</button>
                </div>
                <div id="edit-ctrl-${realIdx}" class="inline-edit-panel" style="display:none; padding: 0 10px 10px 10px;">
                    <!-- Contextual Edit Form Injected Here -->
                </div>
            </div>
        `;
    }).join('');
}

function showInlineEdit(idx) {
    document.querySelectorAll('.inline-edit-panel').forEach(p => {
        p.style.display = 'none';
        p.innerHTML = '';
    });

    const panel = document.getElementById(`edit-ctrl-${idx}`);
    const item = state.ings[idx];
    
    let dateVal = "";
    if (item['Use By']) {
        const d = new Date(item['Use By']);
        dateVal = !isNaN(d) ? d.toISOString().split('T')[0] : "";
    }

    panel.innerHTML = `
        <div class="card" style="margin-top:0; border-style:dashed; background:#f9f9f9;">
            <div class="grid-2">
                <div><label>Qty</label><input type="number" id="edit-q-${idx}" value="${item.Qty}"></div>
                <div>
                    <label>Unit</label>
                    <select id="edit-u-${idx}">
                        <option value="units" ${item.Unit === 'units' ? 'selected' : ''}>units</option>
                        <option value="g" ${item.Unit === 'g' ? 'selected' : ''}>g</option>
                        <option value="ml" ${item.Unit === 'ml' ? 'selected' : ''}>ml</option>
                    </select>
                </div>
            </div>
            <label>Use By</label>
            <input type="date" id="edit-ub-${idx}" value="${dateVal}">
            <div class="grid-2" style="margin-top:10px;">
                <button class="btn btn-p" onclick="saveInlineUpdate(${idx})">Update Row</button>
                <button class="btn btn-s" onclick="document.getElementById('edit-ctrl-${idx}').style.display='none'">Cancel</button>
            </div>
        </div>
    `;
    panel.style.display = 'block';
}

async function saveInlineUpdate(idx) {
    state.ings[idx].Qty = document.getElementById(`edit-q-${idx}`).value;
    state.ings[idx].Unit = document.getElementById(`edit-u-${idx}`).value;
    state.ings[idx]['Use By'] = document.getElementById(`edit-ub-${idx}`).value;

    persist();
    renderFridge();
    await syncToSheet(); 
}

function renderMealPlan() {
    const cont = document.getElementById('pCont');
    if (!state.plan || !state.plan.days) return;

    const today = new Date();
    today.setHours(0,0,0,0);

    const futureDays = state.plan.days.filter(d => {
        const p = d.date.split('/');
        return new Date(p[2], p[1]-1, p[0]) >= today;
    });

    cont.innerHTML = futureDays.map(d => `
        <div class="card" style="padding:0; overflow:hidden;">
            <div style="background:var(--ink); color:white; padding:10px 20px; font-family:Playfair Display;">
                ${d.day} <span style="font-size:0.8rem; opacity:0.7;">(${d.date})</span>
            </div>
            <div style="padding:15px;">
                <label>Lunch (Solo)</label>
                <div class="meal-link" onclick="getRecipe('${d.lunch}')">${d.lunch}</div>
                
                <label style="margin-top:15px;">Dinner (Family)</label>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="meal-link" onclick="getRecipe('${d.dinner}')">${d.dinner}</div>
                    <button class="btn btn-s" style="width:auto; padding:4px 8px; font-size:0.7rem;" onclick="regenMeal('${d.date}')">🎲</button>
                </div>
            </div>
        </div>
    `).join('');
}

function getExpiryLabel(dateStr) {
    if (!dateStr) return '';
    const today = new Date();
    today.setHours(0,0,0,0);
    const exp = new Date(dateStr);
    if (isNaN(exp)) return '';

    const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    let cls = '';
    let txt = '';

    if (diff < 0) { txt = `Expired ${Math.abs(diff)}d ago`; cls = 'expiry-critical'; }
    else if (diff === 0) { txt = 'Expires TODAY'; cls = 'expiry-critical'; }
    else if (diff <= 2) { txt = `Expires in ${diff}d`; cls = 'expiry-soon'; }
    else { txt = `Use by ${exp.toLocaleDateString('en-GB', {day:'numeric', month:'short'})}`; }

    return `<span class="expiry-tag ${cls}">${txt}</span>`;
}

// --- STAPLES LOGIC (RESTORED) ---

function renderStapleTags() {
    const cont = document.getElementById('stapleTags');
    if(!cont) return;
    cont.innerHTML = (state.staples || []).map((s, i) => `
        <div class="staple-tag">${s}<span onclick="removeStaple(${i})">×</span></div>
    `).join('');
}

function addStaple() {
    const input = document.getElementById('newStaple');
    const val = input.value.trim();
    if(val) {
        if(!state.staples) state.staples = [];
        state.staples.push(val);
        input.value = '';
        renderStapleTags();
        persist();
        syncToSheet();
    }
}

function removeStaple(i) {
    state.staples.splice(i, 1);
    renderStapleTags();
    persist();
    syncToSheet();
}
