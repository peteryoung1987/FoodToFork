async function generatePlan() {
    const btn = document.getElementById('gBtn');
    if(!state.ak) return alert("API Key Required");
    
    btn.disabled = true;
    btn.innerText = "Consulting the Chef...";
    setStatus("Generating...");

    const prompt = `
        Create a 7-day UK meal plan starting ${new Date().toLocaleDateString('en-GB')}.
        
        CONSTRAINTS:
        - Lunch: For a single male. High protein, high volume, low calorie.
        - Dinner: For a family of 3 (2 adults, 9yo girl). 
        - MANDATORY: Sunday Dinner MUST be a traditional Sunday Roast.
        - INVENTORY: ${state.ings.map(i => `${i.Qty}${i.Unit} ${i.Item} (Expires: ${i['Use By']})`).join(', ')}.
        - STAPLES: ${state.staples.join(', ')}.
        - Assume standard UK pantry items are available.
        
        OUTPUT: Return ONLY valid JSON in this format:
        {"days":[{"date":"DD/MM/YYYY", "day":"Monday", "lunch":"...", "dinner":"...", "used_ings":[]}]}
    `;

    try {
        // LOCKED MODEL: gemini-3.1-flash-lite-preview
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${state.ak}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text;
        
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            state.plan = JSON.parse(jsonMatch[0]);
            persist();
            renderMealPlan();
            syncToSheet();
        }
    } catch (e) {
        console.error(e);
        alert("Error generating plan. Check console.");
    }

    btn.disabled = false;
    btn.innerText = "✨ Generate 7-Day Plan";
    setStatus("Ready");
}

async function getRecipe(meal) {
    if(!state.ak) return alert("API Key Required");
    
    const modal = document.createElement('div');
    modal.id = "recipe-overlay";
    modal.className = "recipe-modal-full";
    modal.innerHTML = `<div class="recipe-content"><h2>Preparing ${meal}...</h2></div>`;
    document.body.appendChild(modal);

    const p = `
        TASK: Write a recipe for "${meal}".
        CONSTRAINTS:
        - Use Inventory: ${state.ings.map(i=>i.Item).join(', ')}.
        - Tone: Direct, UK-centric.
        - Include a "Shopping List" for specific recipe items with UK prices.
    `;

    try {
        // LOCKED MODEL: gemini-3.1-flash-lite-preview
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${state.ak}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: p }] }] })
        });
        
        const data = await response.json();
        const recipeText = data.candidates[0].content.parts[0].text;
        
        modal.innerHTML = `
            <div class="recipe-content">
                <h1>${meal}</h1>
                <div class="recipe-text">${recipeText.replace(/\n/g, '<br>')}</div>
                <button class="btn btn-p" onclick="document.getElementById('recipe-overlay').remove()">← Back to Plan</button>
            </div>
        `;
    } catch(e) {
        alert("Recipe fetch failed.");
        modal.remove();
    }
}

async function regenMeal(date) {
    setStatus("Rerolling...");
    const hint = prompt("Any specific idea for this meal?");
    
    const p = `
        Regenerate Dinner for ${date}. ${hint ? 'Hint: '+hint : ''}. 
        Inventory: ${state.ings.map(i=>i.Item).join(',')}. 
        Return ONLY JSON: {"dinner":"...", "used_ings":[]}
    `;

    try {
        // LOCKED MODEL: gemini-3.1-flash-lite-preview
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${state.ak}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: p }] }] })
        });
        
        const data = await response.json();
        const jsonMatch = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const res = JSON.parse(jsonMatch[0]);
            const idx = state.plan.days.findIndex(x => x.date === date);
            if (idx !== -1) {
                state.plan.days[idx].dinner = res.dinner;
                persist();
                renderMealPlan();
                syncToSheet();
            }
        }
    } catch(e) { alert("Could not update meal."); }
    setStatus("Ready");
}
