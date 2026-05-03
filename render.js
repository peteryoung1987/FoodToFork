let state = { ings: [], staples: [], plan: { days: [] }, ak: '', su: '' };
const saved = localStorage.getItem('ftf_v2');
if (saved) state = JSON.parse(saved);

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('ak').value = state.ak || '';
    document.getElementById('su').value = state.su || '';
    if (state.su) sync(); // Auto-pull on load
    sh('plan');
});

function persist() {
    localStorage.setItem('ftf_v2', JSON.stringify(state));
}

// --- TAB SYSTEM ---
function sh(v) {
    document.querySelectorAll('.view, .tab').forEach(e => e.classList.remove('active'));
    document.getElementById('v-' + v).classList.add('active');
    document.getElementById('t-' + v).classList.add('active');
    if(v === 'ings') renderFridge();
    if(v === 'set') renderStapleTags();
    if(v === 'plan') renderMealPlan();
}

// --- SYNC LOGIC (Matches your working Script) ---
async function sync() {
    if(!state.su) return;
    document.getElementById('status').innerText = "Syncing...";
    try {
        const r = await fetch(state.su.trim() + "?action=pullAll&t=" + Date.now());
        const d = await r.json();
        state.ings = d.ingredients || [];
        state.staples = d.staples || [];
        if(d.plan) state.plan = d.plan;
        persist();
        renderFridge(); 
        renderMealPlan();
    } catch(e) { console.error("Pull failed:", e); }
    document.getElementById('status').innerText = "Ready";
}

async function pushAll() {
    if(!state.su) return;
    document.getElementById('status').innerText = "Saving...";
    try {
        // Matches your working "pushAll" action key
        await fetch(state.su.trim(), { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify({ action: 'pushAll', ...state }) 
        });
        setTimeout(() => { document.getElementById('status').innerText = "Ready"; }, 800);
    } catch(e) { console.error("Push failed:", e); }
}

// --- FRIDGE & EDITING ---
function pushItem() {
    const n = document.getElementById('n').value;
    const q = document.getElementById('q').value;
    const u = document.getElementById('u').value;
    if(!n) return;
    state.ings.push({ Item: n, Qty: q, Unit: u });
    document.getElementById('n').value = '';
    persist(); renderFridge(); pushAll();
}

function renderFridge() {
    const list = document.getElementById('iList');
    list.innerHTML = (state.ings || []).map((item, idx) => `
        <div class="ing-card" style="background:white; border:1px solid var(--border); border-radius:10px; margin-bottom:0.75rem; padding:1rem;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div onclick="showInlineEdit(${idx})" style="cursor:pointer; flex:1;">
                    <strong>${item.Item}</strong><br>
                    <small>${item.Qty} ${item.Unit || 'units'}</small>
                </div>
                <button class="btn btn-s" style="width:auto; color:red; border:none; margin:0;" onclick="eatItem('${item.Item}')">✕</button>
            </div>
            <div id="edit-ctrl-${idx}" style="display:none; padding:10px; background:#f9f9f9; border-radius:8px; margin-top:10px; border: 1px dashed var(--border);"></div>
        </div>
    `).join('');
}

function showInlineEdit(idx) {
    const panel = document.getElementById(`edit-ctrl-${idx}`);
    const item = state.ings[idx];
    if (panel.style.display === 'block') { panel.style.display = 'none'; return; }
    panel.innerHTML = `
        <div style="display:flex; gap:10px; margin-bottom:10px;">
            <div style="flex:1"><label>Qty</label><input type="number" id="edit-q-${idx}" value="${item.Qty}"></div>
            <div style="flex:1"><label>Unit</label>
                <select id="edit-u-${idx}"><option>units</option><option>g</option><option>ml</option></select>
            </div>
        </div>
        <button class="btn btn-p" onclick="saveInlineUpdate(${idx})">Update</button>
    `;
    panel.style.display = 'block';
}

function saveInlineUpdate(idx) {
    state.ings[idx].Qty = document.getElementById(`edit-q-${idx}`).value;
    state.ings[idx].Unit = document.getElementById(`edit-u-${idx}`).value;
    persist(); renderFridge(); pushAll();
}

function eatItem(name) {
    state.ings = state.ings.filter(i => i.Item !== name);
    persist(); renderFridge(); pushAll();
}

// --- MEAL PLAN & STAPLES ---
function renderMealPlan() {
    const cont = document.getElementById('pCont');
    if(!state.plan || !state.plan.days) return;
    const today = new Date().setHours(0,0,0,0);
    const futureDays = state.plan.days.filter(d => {
        const p = d.date.split('/');
        return new Date(p[2], p[1]-1, p[0]) >= today;
    }).sort((a,b) => {
        const ad = a.date.split('/'); const bd = b.date.split('/');
        return new Date(ad[2], ad[1]-1, ad[0]) - new Date(bd[2], bd[1]-1, bd[0]);
    });

    cont.innerHTML = futureDays.map(d => `
        <div class="day-card">
            <div class="day-h">${d.day} (${d.date})</div>
            <div class="m-box">
                <label>Lunch</label>
                <p onclick="getRecipe('${d.lunch}')" style="cursor:pointer; text-decoration:underline;">${d.lunch}</p>
            </div>
            <div class="m-box">
                <label>Dinner</label>
                <p onclick="getRecipe('${d.dinner}')" style="cursor:pointer; text-decoration:underline;">${d.dinner}</p>
                <div style="margin-top:10px; display:flex; gap:5px;">
                    <button class="btn btn-s" style="width:auto; font-size:0.6rem; padding:5px 10px;" onclick="regenMeal('${d.date}')">🎲 Regen</button>
                    <button class="btn btn-s" style="width:auto; font-size:0.6rem; padding:5px 10px;" onclick="hintMeal('${d.date}')">💡 Hint</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderStapleTags() {
    document.getElementById('stapleTags').innerHTML = (state.staples || []).map((s, i) => `
        <div class="staple-tag">${s}<span onclick="state.staples.splice(${i},1);renderStapleTags();persist();" style="cursor:pointer; margin-left:5px;">×</span></div>
    `).join('');
}

function addStapleTag() {
    const v = document.getElementById('newStaple').value;
    if(v) { state.staples.push(v); document.getElementById('newStaple').value=''; renderStapleTags(); persist(); }
}

function saveS() {
    state.ak = document.getElementById('ak').value.trim();
    state.su = document.getElementById('su').value.trim();
    persist(); alert("Saved");
}
