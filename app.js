import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, getDocs, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

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
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// --- CARGAR LISTA ACTUAL ---
onSnapshot(actualListRef, (snapshot) => {
    const listUl = document.getElementById("shopping-list");
    const badge = document.getElementById("badge-count");
    listUl.innerHTML = "";
    currentList = [];
    
    snapshot.forEach(d => {
        const item = { id: d.id, ...d.data() };
        currentList.push(item);
        const li = document.createElement("li");
        li.innerHTML = `<span>${item.nombre}</span> <button class="delete-btn" onclick="deleteItem('${item.id}')">✕</button>`;
        listUl.appendChild(li);
    });
    badge.innerText = currentList.length;
});

window.deleteItem = async (id) => await deleteDoc(doc(db, "lista_actual", id));

// --- CARGAR Y FILTRAR CATÁLOGO ---
onSnapshot(catalogRef, (snapshot) => {
    catalogData = [];
    snapshot.forEach(d => catalogData.push({id: d.id, ...d.data()}));
    renderCatalog("");
});

function renderCatalog(filter) {
    const catalogUl = document.getElementById("catalog-list");
    catalogUl.innerHTML = "";
    const filtered = catalogData.filter(p => p.nombre.toLowerCase().includes(filter.toLowerCase()));
    
    filtered.forEach(p => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${p.nombre}</span> <button class="add-from-catalog" onclick="addToCurrentList('${p.nombre}')">+</button>`;
        catalogUl.appendChild(li);
    });
}

document.getElementById("product-input").addEventListener("input", (e) => renderCatalog(e.target.value));

// --- AÑADIR PRODUCTOS ---
window.addToCurrentList = async (name) => {
    await addDoc(actualListRef, { nombre: name });
};

document.getElementById("add-btn").addEventListener("click", async () => {
    const input = document.getElementById("product-input");
    const val = input.value.trim();
    if(val) {
        await addToCurrentList(val);
        if(!catalogData.find(p => p.nombre.toLowerCase() === val.toLowerCase())) {
            await addDoc(catalogRef, { nombre: val });
        }
        input.value = "";
    }
});

// --- WHATSAPP Y VACIAR ---
document.querySelectorAll(".send-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
        if(currentList.length === 0) return alert("Lista vacía");
        
        let msg = `🛒 *LISTA DE LA COMPRA* 🛒\n\n`;
        currentList.forEach(i => msg += `• ${i.nombre}\n`);
        
        window.open(`https://wa.me/${btn.dataset.phone}?text=${encodeURIComponent(msg)}`, "_blank");
        
        // Vaciar lista
        const snap = await getDocs(actualListRef);
        snap.forEach(async (d) => await deleteDoc(doc(db, "lista_actual", d.id)));
    });
});