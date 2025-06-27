const entries = [];
const totals = {
    weight: 0,
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0
};

document.getElementById('food-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const food = document.getElementById('food').value.trim();
    const weight = parseFloat(document.getElementById('weight').value);
    if (!food || !weight) return;

    try {
        const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(food)}&search_simple=1&action=process&json=1`);
        const data = await response.json();
        if (data.products && data.products.length > 0) {
            const product = data.products[0];
            const nutr = product.nutriments || {};
            const energy = parseFloat(nutr["energy-kcal_100g"]) || 0;
            const protein = parseFloat(nutr["proteins_100g"]) || 0;
            const fat = parseFloat(nutr["fat_100g"]) || 0;
            const carbs = parseFloat(nutr["carbohydrates_100g"]) || 0;

            const factor = weight / 100;
            const entry = {
                food,
                weight,
                calories: energy * factor,
                protein: protein * factor,
                fat: fat * factor,
                carbs: carbs * factor
            };
            entries.push(entry);
            updateTable();
            document.getElementById('food-form').reset();
        } else {
            alert('Keine Daten gefunden.');
        }
    } catch (err) {
        console.error(err);
        alert('Fehler beim Abrufen der Daten.');
    }
});

function updateTable() {
    const tbody = document.querySelector('#entries tbody');
    tbody.innerHTML = '';
    totals.weight = totals.calories = totals.protein = totals.fat = totals.carbs = 0;

    entries.forEach(e => {
        totals.weight += e.weight;
        totals.calories += e.calories;
        totals.protein += e.protein;
        totals.fat += e.fat;
        totals.carbs += e.carbs;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${e.food}</td>
            <td>${e.weight.toFixed(1)}</td>
            <td>${e.calories.toFixed(1)}</td>
            <td>${e.protein.toFixed(1)}</td>
            <td>${e.fat.toFixed(1)}</td>
            <td>${e.carbs.toFixed(1)}</td>`;
        tbody.appendChild(row);
    });

    document.getElementById('total-weight').innerText = totals.weight.toFixed(1);
    document.getElementById('total-calories').innerText = totals.calories.toFixed(1);
    document.getElementById('total-protein').innerText = totals.protein.toFixed(1);
    document.getElementById('total-fat').innerText = totals.fat.toFixed(1);
    document.getElementById('total-carbs').innerText = totals.carbs.toFixed(1);
}
