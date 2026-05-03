function renderFridge() {
    const list = document.getElementById('iList');
    if (!state.ings || state.ings.length === 0) {
        list.innerHTML = "<p style='text-align:center; opacity:0.5;'>The fridge is empty, go shopping!</p>";
        return;
    }

    // Sort by Expiry
    const sorted = [...state.ings].sort((a, b) => {
        if (!a['Use By']) return 1;
        if (!b['Use By']) return -1;
        return new Date(a['Use By']) - new Date(b['Use By']);
    });

    list.innerHTML = sorted.map((item, originalIdx) => {
        // We need the actual index from the original array for editing/deleting
        const realIdx = state.ings.findIndex(i => i === item);
        const expiryInfo = getExpiryLabel(item['Use By']);
        
        return `
            <div class="ing-item">
                <div onclick="editItem(${realIdx})" style="cursor:pointer; flex:1;">
                    <div style="font-weight:700;">${item.Item}</div>
                    <div class="ing-meta">
                        ${item.Qty} ${item.Unit} • ${item.Category} • ${item.Storage}
                    </div>
                    ${expiryInfo}
                </div>
                <button class="btn btn-s" style="width:auto; color:var(--warn); border:none;" onclick="deleteItem(${realIdx})">✕</button>
            </div>
        `;
    }).join('');
}

function getExpiryLabel(dateStr) {
    if (!dateStr) return '';
    const today = new Date();
    today.setHours(0,0,0,0);
    const exp = new Date(dateStr);
    const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));

    let cls = '';
    let txt = '';

    if (diff < 0) { txt = `Expired ${Math.abs(diff)}d ago`; cls = 'expiry-critical'; }
    else if (diff === 0) { txt = 'Expires TODAY'; cls = 'expiry-critical'; }
    else if (diff <= 2) { txt = `Expires in ${diff}d`; cls = 'expiry-soon'; }
    else { txt = `Use by ${exp.toLocaleDateString('en-GB', {day:'numeric', month:'short'})}`; }

    return `<span class="expiry-tag ${cls}">${txt}</span>`;
}

function renderMealPlan() {
    const cont = document.getElementById('pCont');
    if (!state.plan || !state.plan.days || state.plan.days.length === 0) {
        cont.innerHTML = "<p style='text-align:center; padding:2rem; opacity:0.5;'>No plan generated yet. Hit the button above.</p>";
        return;
    }

    const today = new Date().setHours(0,0,0,0);

    const futureDays = state.plan.days.filter(d => {
        const p = d.date.split('/');
        return new Date(p[2], p[1]-1, p[0]) >= today;
    }).sort((a,b) => {
        const ad = a.date.split('/'); const bd = b.date.split('/');
        return new Date(ad[2], ad[1]-1, ad[0]) - new Date(bd[2], bd[1]-1, bd[0]);
    });

    cont.innerHTML = futureDays.map(d => `
        <div class="card" style="padding:0; overflow:hidden;">
            <div style="background:var(--ink); color:white; padding:10px 20px; font-family:Playfair Display;">
                ${d.day} <span style="font-size:0.8rem; opacity:0.7;">(${d.date})</span>
            </div>
            <div style="padding:15px;">
                <label>Lunch (Solo)</label>
                <div style="margin-bottom:15px; font-weight:500;">${d.lunch}</div>
                <label>Dinner (Family)</label>
                <div style="font-weight:500; display:flex; justify-content:space-between; align-items:center;">
                    ${d.dinner}
                    <button class="btn btn-s" style="width:auto; padding:4px 8px; font-size:0.7rem;" onclick="regenMeal('${d.date}')">🎲 Regen</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderStapleTags() {
    document.getElementById('stapleTags').innerHTML = state.staples.map((s, i) => `
        <div class="staple-tag">${s}<span onclick="removeStaple(${i})">×</span></div>
    `).join('');
}

function addStaple() {
    const val = document.getElementById('newStaple').value.trim();
    if(val) {
        state.staples.push(val);
        document.getElementById('newStaple').value = '';
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