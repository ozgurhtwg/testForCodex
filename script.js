let db;
const entries = [];

window.addEventListener('load', async () => {
    try {
        const res = await fetch('http://localhost:3000/entries');
        if (res.ok) {
            const saved = await res.json();
            saved.forEach(e => entries.push(e));
            updateTable();
        }
    } catch (err) {
        console.error('Could not load saved entries', err);
    }
});
const totals = {
    weight: 0,
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0
};

function openDB() {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);
        const request = indexedDB.open('nutritionApp', 1);
        request.onupgradeneeded = (e) => {
            db = e.target.result;
            db.createObjectStore('users', { keyPath: 'username' });
        };
        request.onsuccess = (e) => { db = e.target.result; resolve(db); };
        request.onerror = (e) => reject(e.target.error);
    });
}

async function hashPassword(pw) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(pw));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function registerUser(username, password) {
    await openDB();
    const hashed = await hashPassword(password);
    return new Promise((resolve, reject) => {
        const tx = db.transaction('users', 'readwrite');
        tx.objectStore('users').add({ username, password: hashed }).onsuccess = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function loginUser(username, password) {
    await openDB();
    const hashed = await hashPassword(password);
    return new Promise((resolve, reject) => {
        const tx = db.transaction('users', 'readonly');
        const req = tx.objectStore('users').get(username);
        req.onsuccess = () => {
            const user = req.result;
            resolve(user && user.password === hashed);
        };
        req.onerror = () => reject(req.error);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('loggedIn') === 'true') {
        document.getElementById('auth').style.display = 'none';
        document.getElementById('app').style.display = 'block';
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value;
    if (!user || !pass) return;
    try {
        await registerUser(user, pass);
        alert('Registrierung erfolgreich');
        e.target.reset();
    } catch {
        alert('Fehler bei der Registrierung');
    }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value;
    if (!user || !pass) return;
    try {
        const ok = await loginUser(user, pass);
        if (ok) {
            sessionStorage.setItem('loggedIn', 'true');
            document.getElementById('auth').style.display = 'none';
            document.getElementById('app').style.display = 'block';
        } else {
            alert('Ungültige Anmeldedaten');
        }
    } catch {
        alert('Fehler beim Login');
    }
});

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
            fetch('http://localhost:3000/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry)
            }).catch(err => console.error('Failed to save entry', err));
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
