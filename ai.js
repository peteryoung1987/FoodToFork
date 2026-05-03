async function generatePlan() {
    const btn = document.getElementById('gBtn');
    if(!state.ak) return alert("Need an API Key, boss.");
    
    btn.disabled = true;
    btn.innerText = "Consulting the Chef...";
    setStatus("Generating...");

    const prompt = `
        Create a 7-day UK meal plan starting ${new Date().toLocaleDateString('en-GB')}.
        
        CONSTRAINTS:
        - Lunch: For a single male. High protein, high volume, low calorie (e.g., big salads, lean protein).
        - Dinner: For a family of 3 (2 adults, 9yo girl). 
        - MANDATORY: Sunday Dinner MUST be a traditional Sunday Roast.
        - INVENTORY: ${state.ings.map(i => `${i.Qty}${i.Unit} ${i.Item} (Expires: ${i['Use By']})`).join(', ')}.
        - STAPLES: ${state.staples.join(', ')}.
        - Assume standard UK pantry items (spices, flour, oils, etc.) are available.
        
        OUTPUT: Return ONLY valid JSON in this format:
        {"days":[{"date":"DD/MM/YYYY", "day":"Monday", "lunch":"...", "dinner":"...", "used_ings":[]}]}
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.ak}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        const data = await response.json();
        let rawText = data.candidates[0].content.parts[0].text;
        
        // Technical Optimisation: Clean AI preamble/markdown
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            state.plan = JSON.parse(jsonMatch[0]);
            persist();
            renderMealPlan();
            syncToSheet();
        }
    } catch (e) {
        console.error(e);
        alert("AI shit the bed. Check your API key or connection.");
    }

    btn.disabled = false;
    btn.innerText = "✨ Generate 7-Day Plan";
    setStatus("Ready");
}

async function regenMeal(date) {
    setStatus("Rerolling...");
    const hint = prompt("Any specific vibe for this reroll?");
    
    const promptText = `
        Regenerate the Dinner for ${date}. 
        ${hint ? `User Hint: ${hint}` : ''}
        Inventory to use up: ${state.ings.map(i => i.Item).join(', ')}.
        Return ONLY JSON: {"dinner":"...", "used_ings":[]}
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.ak}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
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
    } catch(e) { alert("Couldn't reroll."); }
    setStatus("Ready");
}