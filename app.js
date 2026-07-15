import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "TU_API_KEY", // <--- MANTÉN TUS KEYS AQUÍ
    authDomain: "compra-nfc.firebaseapp.com",
    projectId: "compra-nfc",
    storageBucket: "compra-nfc.firebasestorage.app",
    messagingSenderId: "77738132764",
    appId: "1:77738132764:web:31f8d53c6fd33a41bc66d9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const actualListRef = collection(db, "lista_actual");
const catalogRef = collection(db, "catalogo_productos");

let catalogData = [];
let currentList = [];

// --- NAVEGACIÓN DE PESTAÑAS ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// --- SWIPE TABS ---
const contentEl = document.querySelector('.content');
let tabTouch = null;

contentEl.addEventListener('touchstart', (e) => {
    if (e.target.closest('#shopping-list')) return;
    tabTouch = {
        x: e.changedTouches[0].screenX,
        y: e.changedTouches[0].screenY
    };
}, { passive: true });

contentEl.addEventListener('touchend', (e) => {
    if (!tabTouch || e.target.closest('#shopping-list')) { tabTouch = null; return; }
    const dx = e.changedTouches[0].screenX - tabTouch.x;
    const dy = Math.abs(e.changedTouches[0].screenY - tabTouch.y);
    tabTouch = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < dy) return;

    const tabs = ['tab-catalog', 'tab-list'];
    const active = document.querySelector('.tab-content.active');
    const idx = tabs.indexOf(active.id);

    if (dx < 0 && idx < tabs.length - 1) switchTab(tabs[idx + 1]);
    else if (dx > 0 && idx > 0) switchTab(tabs[idx - 1]);
}, { passive: true });

// --- CARGAR LISTA ACTUAL ---
onSnapshot(actualListRef, (snapshot) => {
    const listUl = document.getElementById("shopping-list");
    const badge = document.getElementById("badge-count");
    listUl.innerHTML = "";
    currentList = [];
    
    snapshot.forEach(d => {
        const data = d.data();
        const item = { id: d.id, nombre: data.nombre, cantidad: data.cantidad || 1 };
        currentList.push(item);
        const li = document.createElement("li");
        li.innerHTML = `
            <span class="item-name">${item.nombre}</span>
            <div class="item-actions">
                ${item.cantidad > 1 ? `<span class="item-qty">×${item.cantidad}</span>` : ''}
                <button class="delete-btn" onclick="deleteItem('${item.id}')">✕</button>
            </div>`;
        listUl.appendChild(li);
    });
    badge.innerText = currentList.length;
});

window.deleteItem = async (id) => await deleteDoc(doc(db, "lista_actual", id));

document.getElementById("clear-list").addEventListener("click", async () => {
    if (currentList.length === 0) return;
    const snap = await getDocs(actualListRef);
    snap.forEach(async (d) => await deleteDoc(doc(db, "lista_actual", d.id)));
});

// --- CARGAR Y FILTRAR CATÁLOGO ---
onSnapshot(catalogRef, (snapshot) => {
    catalogData = [];
    snapshot.forEach(d => catalogData.push({id: d.id, ...d.data()}));
    renderCatalog("");
});

function renderCatalog(filter) {
    const catalogUl = document.getElementById("catalog-list");
    catalogUl.innerHTML = "";
    const filtered = catalogData.filter(p => p.nombre.toUpperCase().includes(filter.toUpperCase()));
    
    filtered.forEach(p => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${p.nombre}</span> <button class="add-from-catalog" onclick="addToCurrentList('${p.nombre}')">+</button>`;
        catalogUl.appendChild(li);
    });
}

document.getElementById("product-input").addEventListener("input", (e) => renderCatalog(e.target.value.toUpperCase()));

// --- AÑADIR / CANTIDAD ---
window.addToCurrentList = async (name) => {
    const existing = currentList.find(i => i.nombre.toUpperCase() === name.toUpperCase());
    if (existing) {
        await updateDoc(doc(db, "lista_actual", existing.id), { cantidad: existing.cantidad + 1 });
    } else {
        await addDoc(actualListRef, { nombre: name, cantidad: 1 });
    }
};

document.getElementById("add-btn").addEventListener("click", async () => {
    const input = document.getElementById("product-input");
    const val = input.value.trim().toUpperCase();
    if(val) {
        await addToCurrentList(val);
        if(!catalogData.find(p => p.nombre.toUpperCase() === val.toUpperCase())) {
            await addDoc(catalogRef, { nombre: val });
        }
        input.value = "";
    }
});

// --- WHATSAPP Y VACIAR ---
document.querySelectorAll(".send-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
        if(currentList.length === 0) return alert("Lista vacía");
        
        let msg = `*LISTA DE LA COMPRA*\n\n`;
        currentList.forEach(i => msg += `- ${i.nombre}\n`);
        
        window.open(`https://wa.me/${btn.dataset.phone}?text=${encodeURIComponent(msg)}`, "_blank");
        
        // Vaciar lista
        const snap = await getDocs(actualListRef);
        snap.forEach(async (d) => await deleteDoc(doc(db, "lista_actual", d.id)));
    });
});