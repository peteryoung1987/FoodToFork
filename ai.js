async function generate() {
    const btn = document.getElementById('gBtn');
    if(!state.ak) return alert("API Key Required");
    btn.disabled = true; btn.innerText = "Consulting Chef...";
    
    const prompt = `
    Lunch : just for single male - should be cored in one protein and be high volume low calorie.
    Dinner: Family of 3 (2 adults, 9yo girl). Sunday Roast is mandatory.
    INVENTORY: ${state.ings.map(i => i.Qty + i.Unit + ' ' + i.Item).join(', ')}.
    USER STAPLES: ${state.staples.join(', ')}.
    UNIVERSAL PANTRY: Assume standard UK pantry essentials.
    Return ONLY JSON: {"days":[{"date":"DD/MM/YYYY", "day":"Monday", "lunch":"...", "dinner":"...", "used_ings":["item"]}]}. 
    Plan 7 days from ${new Date().toLocaleDateString('en-GB')}.`;

    try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${state.ak}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const d = await r.json();
        const text = d.candidates[0].content.parts[0].text.replace(/```json|```/gi, "").trim();
        state.plan = JSON.parse(text);
        persist(); renderMealPlan(); pushAll(); 
    } catch(e) { alert("Error generating plan."); }
    btn.disabled = false; btn.innerText = "✨ Generate New 7-Day Plan";
}

async function getRecipe(meal) {
    const m = document.createElement('div');
    m.className = 'recipe-modal'; m.id = 'recipe-overlay';
    m.innerHTML = `<div style="max-width:500px; margin:auto; text-align:center;"><h2>Preparing Recipe...</h2></div>`;
    document.body.appendChild(m);

    const p = `TASK: Write a recipe for "${meal}" based on UK measurements. Include a shopping list with estimated UK prices. Inventory: ${state.ings.map(i=>i.Item).join(', ')}.`;

    try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${state.ak}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: p }] }] })
        });
        const d = await r.json();
        m.innerHTML = `
            <div style="max-width:500px; margin:0 auto 100px auto; position:relative;">
                <h1 style="font-family:Playfair Display;">${meal}</h1>
                <div style="white-space:pre-wrap; line-height:1.6; color:#44403C;">${d.candidates[0].content.parts[0].text}</div>
                <button class="btn btn-p" onclick="document.getElementById('recipe-overlay').remove()">← Back</button>
            </div>
        `;
    } catch(e) { m.remove(); alert("Error loading recipe."); }
}

async function regenMeal(date, hint = "") {
    const p = `Regenerate Dinner for ${date}. ${hint ? 'Hint: '+hint : ''}. Return JSON: {"dinner":"...", "used_ings":[]}`;
    try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${state.ak}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: p }] }] })
        });
        const d = await r.json();
        const res = JSON.parse(d.candidates[0].content.parts[0].text.replace(/```json|```/gi, ""));
        const idx = state.plan.days.findIndex(x => x.date === date);
        if (idx !== -1) {
            state.plan.days[idx].dinner = res.dinner;
            persist(); renderMealPlan(); pushAll();
        }
    } catch(e) { alert("Error."); }
}

function hintMeal(date) { 
    const h = prompt("Any specific idea?"); 
    if(h) regenMeal(date, h); 
}
