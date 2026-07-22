import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "compra-nfc.firebaseapp.com",
    projectId: "compra-nfc",
    storageBucket: "compra-nfc.firebasestorage.app",
    messagingSenderId: "77738132764",
    appId: "1:77738132764:web:31f8d53c6fd33a41bc66d9"
};

const FAMILIAS = {
    madrid: {
        nombre: "Madrid",
        whatsapp: [
            { nombre: "Papá", telefono: "34677475739" },
            { nombre: "Mamá", telefono: "34670745484" },
            { nombre: "Santi", telefono: "34663114035" },
            { nombre: "Jaime", telefono: "34627421138" },
        ]
    },
    miraflores: {
        nombre: "Miraflores",
        whatsapp: [
            { nombre: "Papá", telefono: "34677475739" },
            { nombre: "Mamá", telefono: "34670745484" },
            { nombre: "Santi", telefono: "34663114035" },
            { nombre: "Jaime", telefono: "34627421138" },
        ]
    },
    nere: {
        nombre: "Nere",
        whatsapp: [
            { nombre: "Iván", telefono: "34616156786" },
            { nombre: "David", telefono: "34619822639" },
            { nombre: "Chusa", telefono: "34653806333" },
            { nombre: "Nere", telefono: "34620171642" },
        ]
    }
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let familiaActual = null;
let unsubLista = null;
let unsubCatalogo = null;
let catalogData = [];
let currentList = [];

function getListaRef() {
    return collection(db, "familias", familiaActual, "lista_actual");
}

function getCatalogoRef() {
    return collection(db, "familias", familiaActual, "catalogo_productos");
}

function renderWhatsAppButtons() {
    const grid = document.getElementById("contacts-grid");
    const familia = FAMILIAS[familiaActual];
    grid.innerHTML = familia.whatsapp.map(c =>
        `<button class="send-btn" data-phone="${c.telefono}" data-name="${c.nombre}">
            <i class="fab fa-whatsapp"></i> ${c.nombre}
        </button>`
    ).join("");
}

function showFamilySelector() {
    document.getElementById("familia-modal").classList.add("open");
}

function hideFamilySelector() {
    document.getElementById("familia-modal").classList.remove("open");
}

function selectFamilia(id) {
    hideFamilySelector();
    initFamily(id);
}

function initFamily(id) {
    familiaActual = id;
    localStorage.setItem("familia", id);

    if (unsubLista) unsubLista();
    if (unsubCatalogo) unsubCatalogo();

    currentList = [];
    catalogData = [];
    document.getElementById("shopping-list").innerHTML = "";
    document.getElementById("badge-count").innerText = "0";
    document.getElementById("catalog-list").innerHTML = "";
    document.getElementById("current-familia").textContent = FAMILIAS[id].nombre;

    renderWhatsAppButtons();

    const listaRef = getListaRef();
    const catalogoRef = getCatalogoRef();

    unsubLista = onSnapshot(listaRef, (snapshot) => {
        const listUl = document.getElementById("shopping-list");
        const badge = document.getElementById("badge-count");
        listUl.innerHTML = "";
        currentList = [];

        snapshot.forEach(d => {
            const data = d.data();
            const item = { id: d.id, nombre: data.nombre, cantidad: data.cantidad || 1 };
            currentList.push(item);

            const li = document.createElement("li");

            const nameSpan = document.createElement("span");
            nameSpan.className = "item-name";
            nameSpan.textContent = item.nombre;

            const actionsDiv = document.createElement("div");
            actionsDiv.className = "item-actions";

            const qtySpan = document.createElement("span");
            qtySpan.className = "item-qty";
            qtySpan.textContent = `×${item.cantidad}`;
            qtySpan.addEventListener("click", () => openQtyModal({ id: item.id, nombre: item.nombre, cantidad: item.cantidad }));

            const delBtn = document.createElement("button");
            delBtn.className = "delete-btn";
            delBtn.textContent = "✕";
            delBtn.addEventListener("click", () => deleteDoc(doc(db, "familias", familiaActual, "lista_actual", item.id)));

            actionsDiv.append(qtySpan, delBtn);
            li.append(nameSpan, actionsDiv);
            listUl.appendChild(li);
        });
        badge.innerText = currentList.length;
    });

    unsubCatalogo = onSnapshot(catalogoRef, (snapshot) => {
        catalogData = [];
        snapshot.forEach(d => catalogData.push({ id: d.id, ...d.data() }));
        renderCatalog("");
    });
}

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

// --- MODAL CANTIDAD ---
let modalItem = null;
const modalEl = document.getElementById("qty-modal");
const modalName = document.getElementById("modal-name");
const modalQty = document.getElementById("modal-qty");
const modalWarning = document.getElementById("modal-warning");

function openQtyModal(item) {
    modalItem = { ...item };
    modalName.textContent = item.nombre;
    updateModalUI();
    modalEl.classList.add("open");
}

function updateModalUI() {
    modalQty.textContent = modalItem.cantidad;
    modalWarning.classList.toggle("show", modalItem.cantidad === 0);
}

function closeQtyModal() {
    modalEl.classList.remove("open");
    if (!modalItem) return;
    if (modalItem.cantidad <= 0) {
        deleteDoc(doc(db, "familias", familiaActual, "lista_actual", modalItem.id));
    } else {
        const orig = currentList.find(i => i.id === modalItem.id);
        if (orig && orig.cantidad !== modalItem.cantidad) {
            updateDoc(doc(db, "familias", familiaActual, "lista_actual", modalItem.id), { cantidad: modalItem.cantidad });
        }
    }
    modalItem = null;
}

document.querySelector(".modal-close").addEventListener("click", closeQtyModal);
modalEl.addEventListener("click", (e) => { if (e.target === e.currentTarget) closeQtyModal(); });
document.querySelector(".modal-qty-btn.minus").addEventListener("click", () => {
    if (!modalItem) return;
    modalItem.cantidad = Math.max(0, modalItem.cantidad - 1);
    updateModalUI();
});
document.querySelector(".modal-qty-btn.plus").addEventListener("click", () => {
    if (!modalItem) return;
    modalItem.cantidad += 1;
    updateModalUI();
});

document.getElementById("clear-list").addEventListener("click", async () => {
    if (currentList.length === 0) return;
    const snap = await getDocs(getListaRef());
    snap.forEach(async (d) => await deleteDoc(doc(db, "familias", familiaActual, "lista_actual", d.id)));
});

// --- CATÁLOGO ---
function renderCatalog(filter) {
    const catalogUl = document.getElementById("catalog-list");
    catalogUl.innerHTML = "";
    const filtered = catalogData.filter(p => p.nombre.toUpperCase().includes(filter.toUpperCase()));

    filtered.forEach(p => {
        const li = document.createElement("li");

        const nameSpan = document.createElement("span");
        nameSpan.textContent = p.nombre;

        const btn = document.createElement("button");
        btn.className = "add-from-catalog";
        btn.textContent = "+";
        btn.addEventListener("click", () => {
            addToCurrentList(p.nombre);
            animateAdd(btn);
        });

        li.append(nameSpan, btn);
        catalogUl.appendChild(li);
    });
}

document.getElementById("product-input").addEventListener("input", (e) => renderCatalog(e.target.value.toUpperCase()));

// --- ANIMACIÓN AL AÑADIR ---
function animateAdd(sourceEl) {
    const tabEl = document.querySelector('.tab-btn[data-tab="tab-list"]');
    if (!sourceEl || !tabEl) return;
    const src = sourceEl.getBoundingClientRect();
    const tgt = tabEl.getBoundingClientRect();

    const dot = document.createElement("div");
    dot.textContent = "✓";
    Object.assign(dot.style, {
        position: "fixed", zIndex: "200", pointerEvents: "none",
        width: "22px", height: "22px", borderRadius: "50%",
        background: "#2ecc71", color: "#fff", fontSize: "11px",
        fontWeight: "bold", display: "flex", alignItems: "center",
        justifyContent: "center", boxShadow: "0 2px 8px rgba(46,204,113,0.5)",
        left: (src.left + src.width / 2 - 11) + "px",
        top: (src.top + src.height / 2 - 11) + "px"
    });
    document.body.appendChild(dot);

    const dx = tgt.left + tgt.width / 2 - src.left - src.width / 2;
    const dy = tgt.top + tgt.height / 2 - src.top - src.height / 2;

    const anim = dot.animate([
        { transform: "scale(1)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, opacity: 0 }
    ], { duration: 550, easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" });

    anim.onfinish = () => {
        dot.remove();
        const badge = document.getElementById("badge-count");
        badge.style.transition = "transform 0.15s ease";
        badge.style.transform = "scale(1.35)";
        setTimeout(() => badge.style.transform = "scale(1)", 250);
    };
}

// --- AÑADIR / CANTIDAD ---
window.addToCurrentList = async (name) => {
    const existing = currentList.find(i => i.nombre.toUpperCase() === name.toUpperCase());
    if (existing) {
        await updateDoc(doc(db, "familias", familiaActual, "lista_actual", existing.id), { cantidad: existing.cantidad + 1 });
    } else {
        await addDoc(getListaRef(), { nombre: name, cantidad: 1 });
    }
};

document.getElementById("add-btn").addEventListener("click", async () => {
    const input = document.getElementById("product-input");
    const val = input.value.trim().toUpperCase();
    if (val) {
        await addToCurrentList(val);
        if (!catalogData.find(p => p.nombre.toUpperCase() === val.toUpperCase())) {
            await addDoc(getCatalogoRef(), { nombre: val });
        }
        input.value = "";
        animateAdd(document.getElementById("add-btn"));
    }
});

// --- WHATSAPP (event delegation) ---
document.getElementById("contacts-grid").addEventListener("click", async (e) => {
    const btn = e.target.closest(".send-btn");
    if (!btn) return;
    if (currentList.length === 0) return alert("Lista vacía");

    let msg = `*LISTA DE LA COMPRA*\n\n`;
    currentList.forEach(i => msg += `- ${i.nombre}\n`);

    window.open(`https://wa.me/${btn.dataset.phone}?text=${encodeURIComponent(msg)}`, "_blank");

    const snap = await getDocs(getListaRef());
    snap.forEach(async (d) => await deleteDoc(doc(db, "familias", familiaActual, "lista_actual", d.id)));
});

// --- FAMILIA SELECTOR ---
document.querySelectorAll(".familia-card").forEach(card => {
    card.addEventListener("click", () => selectFamilia(card.dataset.familia));
});

document.getElementById("familia-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) hideFamilySelector();
});

document.getElementById("settings-btn").addEventListener("click", showFamilySelector);
document.getElementById("familia-close-btn").addEventListener("click", hideFamilySelector);

// --- INICIO ---
document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("familia");
    if (saved && FAMILIAS[saved]) {
        initFamily(saved);
    } else {
        document.getElementById("current-familia").textContent = "Seleccionar familia";
        showFamilySelector();
    }
});
