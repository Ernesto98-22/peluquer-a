// app.js - Peluquería Rosa (basado en el patrón de Bar-Restaurante)

let currentUser = null;
let currentUsername = null;
let currentUserId = null;
let productsData = [];
let currentTestimonioIndex = 0;
let testimoniosData = [];
let favoritos = new Set();
let currentCategory = 'todos';

// Función global para abrir el modal (llamada desde HTML)
window.mostrarModal = function() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        console.log('Modal abierto');
    } else {
        console.error('Modal no encontrado');
    }
};

function cerrarModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ========================================
// INICIALIZACIÓN
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabase) {
        console.error('Supabase no inicializado');
        mostrarErrorGlobal('Error de conexión con la base de datos.');
        return;
    }
    
    await checkSession();
    await loadProducts();
    await loadTestimonios();
    initNavigation();
    initCategoryFilter();
    initSearch();
    initAuthModal();
    initScrollEffects();
    initReservationForm();
    loadFavoritosFromStorage();
});

function mostrarErrorGlobal(msg) {
    const div = document.createElement('div');
    div.className = 'global-error';
    div.innerHTML = `<div style="background:#fee2e2; color:#991b1b; padding:1rem; margin:1rem; border-radius:12px; text-align:center;">${msg}</div>`;
    document.body.prepend(div);
    setTimeout(() => div.remove(), 5000);
}

// ========== AUTENTICACIÓN ==========
async function checkSession() {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        currentUserId = session.user.id;
        currentUsername = session.user.user_metadata?.username || session.user.email.split('@')[0];
        
        const { data: adminData } = await window.supabase
            .from('admin_emails')
            .select('email')
            .eq('email', session.user.email)
            .single();
        
        const isAdmin = !!adminData;
        updateAuthUI(true, isAdmin);
    } else {
        updateAuthUI(false, false);
    }
}

function updateAuthUI(loggedIn, isAdmin) {
    const authBtn = document.getElementById('authBtn');
    const navActions = document.getElementById('navActions');
    
    if (loggedIn && currentUser) {
        authBtn.innerHTML = `<i class="fas fa-user"></i> ${currentUsername}`;
        authBtn.onclick = () => {
            if (isAdmin) {
                if (confirm(`Hola ${currentUsername}. ¿Ir al panel de administración?`)) {
                    window.location.href = 'admin.html';
                }
            } else {
                alert(`Sesión iniciada como ${currentUsername}`);
            }
        };
        
        if (isAdmin && !document.getElementById('adminNavBtn')) {
            const adminBtn = document.createElement('a');
            adminBtn.id = 'adminNavBtn';
            adminBtn.href = 'admin.html';
            adminBtn.className = 'nav-comprar';
            adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> Admin';
            adminBtn.style.marginLeft = '0.5rem';
            navActions.appendChild(adminBtn);
        }
        
        document.querySelectorAll('#comprarNavBtn, .btn-primary[href="#catalogo"], .catalogo-footer .btn-primary').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                window.open('https://wa.me/5351234567?text=Hola,%20quiero%20comprar%20en%20Peluquería%20Rosa', '_blank');
            };
        });
    } else {
        authBtn.innerHTML = `<i class="fas fa-user"></i> Acceder`;
        authBtn.onclick = () => window.mostrarModal();
        
        const adminNavBtn = document.getElementById('adminNavBtn');
        if (adminNavBtn) adminNavBtn.remove();
        
        document.querySelectorAll('#comprarNavBtn, .btn-primary[href="#catalogo"], .catalogo-footer .btn-primary').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                window.mostrarModal();
            };
        });
    }
}

function initAuthModal() {
    const modal = document.getElementById('authModal');
    const closeBtn = document.getElementById('closeModal');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (!modal) return;
    
    if (closeBtn) closeBtn.onclick = () => cerrarModal();
    window.onclick = (e) => { if (e.target === modal) cerrarModal(); };
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('active')) cerrarModal(); });
    
    tabBtns.forEach(btn => {
        btn.onclick = () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            loginForm.classList.toggle('active', tab === 'login');
            registerForm.classList.toggle('active', tab === 'register');
        };
    });
    
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        let identifier = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const statusDiv = document.getElementById('loginStatus');
        
        if (!identifier || !password) {
            showFormStatus(statusDiv, 'Completa todos los campos', 'error');
            return;
        }
        let email = identifier;
        if (identifier.startsWith('+53') || /^[0-9]{8}$/.test(identifier)) {
            let phone = identifier.startsWith('+53') ? identifier : '+53' + identifier;
            email = phone.replace(/\s/g, '') + '@temp.local';
        }
        const { error } = await window.supabase.auth.signInWithPassword({ email, password });
        if (error) {
            showFormStatus(statusDiv, 'Credenciales inválidas', 'error');
        } else {
            showFormStatus(statusDiv, 'Inicio de sesión exitoso', 'success');
            setTimeout(() => {
                cerrarModal();
                checkSession();
            }, 1500);
        }
    };
    
    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        let phone = document.getElementById('registerPhone').value.trim();
        const password = document.getElementById('registerPassword').value;
        const statusDiv = document.getElementById('registerStatus');
        
        if (!username || !phone || !password) {
            showFormStatus(statusDiv, 'Completa los campos obligatorios', 'error');
            return;
        }
        if (password.length < 6) {
            showFormStatus(statusDiv, 'La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        if (!phone.startsWith('+53')) phone = '+53 ' + phone;
        const phonePattern = /^\+53\s?[0-9]{8}$/;
        if (!phonePattern.test(phone)) {
            showFormStatus(statusDiv, 'Teléfono debe tener formato +53 seguido de 8 dígitos', 'error');
            return;
        }
        const userEmail = email ? email : phone.replace(/\s/g, '') + '@temp.local';
        const { error } = await window.supabase.auth.signUp({
            email: userEmail,
            password,
            options: { data: { username, phone, email_original: email } }
        });
        if (error) {
            showFormStatus(statusDiv, 'Error: ' + error.message, 'error');
        } else {
            showFormStatus(statusDiv, 'Cuenta creada. Inicia sesión.', 'success');
            setTimeout(() => {
                document.querySelector('.tab-btn[data-tab="login"]').click();
                registerForm.reset();
            }, 2000);
        }
    };
}

function showFormStatus(element, message, type) {
    element.textContent = message;
    element.className = `form-status ${type}`;
    setTimeout(() => {
        element.textContent = '';
        element.className = 'form-status';
    }, 3000);
}

// ========================================
// PRODUCTOS
// ========================================
async function loadProducts() {
    const { data, error } = await window.supabase.from('productos').select('*');
    if (error) {
        console.error('Error cargando productos:', error);
        productsData = getFallbackProducts();
    } else {
        productsData = data;
    }
    renderProducts(currentCategory);
}

function getFallbackProducts() {
    return [
        { id: 1, nombre: 'Tinte Rosa Pastel', precio: 1200, categoria: 'tintes', imagen_url: 'https://placehold.co/400x400/ffb6d9/white?text=Tinte+Rosa' },
        { id: 2, nombre: 'Champú Hidratante', precio: 850, categoria: 'champus', imagen_url: 'https://placehold.co/400x400/ffb6d9/white?text=Champú' },
        { id: 3, nombre: 'Keratina Líquida', precio: 2100, categoria: 'keratinas', imagen_url: 'https://placehold.co/400x400/ffb6d9/white?text=Keratina' },
        { id: 4, nombre: 'Crema para Peinar', precio: 650, categoria: 'cremas', imagen_url: 'https://placehold.co/400x400/ffb6d9/white?text=Crema' },
        { id: 5, nombre: 'Set de Cepillos', precio: 980, categoria: 'variados', imagen_url: 'https://placehold.co/400x400/ffb6d9/white?text=Cepillos' }
    ];
}

function renderProducts(category) {
    const grid = document.getElementById('productosGrid');
    if (!grid) return;
    
    const filtered = category === 'todos' 
        ? productsData 
        : productsData.filter(p => p.categoria === category);
    
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="no-products">No hay productos en esta categoría.</div>';
        return;
    }
    
    grid.innerHTML = filtered.map(p => `
        <article class="product-card" data-id="${p.id}">
            <img src="${p.imagen_url}" alt="${p.nombre}" loading="lazy">
            <div class="product-actions">
                <button class="favorite-btn ${favoritos.has(p.id) ? 'liked' : ''}" data-id="${p.id}" aria-label="${favoritos.has(p.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
            <div class="purchase-arrow" data-id="${p.id}" role="button" tabindex="0" aria-label="Comprar ${p.nombre}">
                <i class="fas fa-arrow-up"></i>
            </div>
            <div class="product-info">
                <h3 class="product-title">${escapeHtml(p.nombre)}</h3>
                <p class="product-price">$${p.precio.toLocaleString()} CUP</p>
            </div>
        </article>
    `).join('');
    
    attachProductEvents();
}

function attachProductEvents() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            if (favoritos.has(id)) {
                favoritos.delete(id);
                btn.classList.remove('liked');
            } else {
                favoritos.add(id);
                btn.classList.add('liked');
            }
            saveFavoritosToStorage();
        };
    });
    
    document.querySelectorAll('.purchase-arrow').forEach(arrow => {
        arrow.onclick = (e) => {
            e.stopPropagation();
            const id = parseInt(arrow.dataset.id);
            const producto = productsData.find(p => p.id === id);
            if (producto) {
                if (currentUser) {
                    const mensaje = `Hola! Me interesa comprar: ${producto.nombre} - $${producto.precio} CUP`;
                    window.open(`https://wa.me/5351234567?text=${encodeURIComponent(mensaje)}`, '_blank');
                } else {
                    window.mostrarModal();
                }
            }
        };
    });
}

function initCategoryFilter() {
    const catBtns = document.querySelectorAll('.cat-btn');
    catBtns.forEach(btn => {
        btn.onclick = () => {
            catBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            currentCategory = btn.dataset.category;
            renderProducts(currentCategory);
        };
    });
}

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    if (!searchInput || !searchBtn) return;
    const performSearch = () => {
        const term = searchInput.value.trim().toLowerCase();
        if (!term) {
            renderProducts(currentCategory);
            return;
        }
        const filtered = productsData.filter(p => p.nombre.toLowerCase().includes(term));
        const grid = document.getElementById('productosGrid');
        if (filtered.length === 0) {
            grid.innerHTML = '<div class="no-products">No se encontraron productos.</div>';
        } else {
            grid.innerHTML = filtered.map(p => `
                <article class="product-card" data-id="${p.id}">
                    <img src="${p.imagen_url}" alt="${p.nombre}" loading="lazy">
                    <div class="product-actions">
                        <button class="favorite-btn ${favoritos.has(p.id) ? 'liked' : ''}" data-id="${p.id}">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                    <div class="purchase-arrow" data-id="${p.id}">
                        <i class="fas fa-arrow-up"></i>
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${escapeHtml(p.nombre)}</h3>
                        <p class="product-price">$${p.precio.toLocaleString()} CUP</p>
                    </div>
                </article>
            `).join('');
            attachProductEvents();
        }
    };
    searchBtn.onclick = performSearch;
    searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
}

// ========== TESTIMONIOS ==========
async function loadTestimonios() {
    const { data, error } = await window.supabase
        .from('reviews')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false });
    
    if (error || !data || data.length === 0) {
        testimoniosData = [
            { nombre_usuario: "Laura M.", comentario: "Excelente atención, me encantó mi nuevo corte. Volveré seguro.", rating: 5 },
            { nombre_usuario: "Camila R.", comentario: "El color quedó perfecto y el ambiente es muy acogedor.", rating: 5 },
            { nombre_usuario: "Sofía G.", comentario: "Profesionales muy capacitados, me asesoraron increíble.", rating: 4 }
        ];
    } else {
        testimoniosData = data;
    }
    renderTestimonio(0);
    initTestimoniosCarousel();
}

function renderTestimonio(index) {
    const slider = document.getElementById('testimoniosSlider');
    if (!slider) return;
    const t = testimoniosData[index % testimoniosData.length];
    const stars = '★'.repeat(t.rating) + '☆'.repeat(5 - t.rating);
    slider.innerHTML = `
        <div class="testimonio-item">
            <div class="testimonio-rating">${stars}</div>
            <p class="testimonio-text">"${escapeHtml(t.comentario)}"</p>
            <p class="testimonio-author">— ${escapeHtml(t.nombre_usuario)}</p>
        </div>
    `;
}

function initTestimoniosCarousel() {
    const prev = document.getElementById('prevTestimonio');
    const next = document.getElementById('nextTestimonio');
    if (prev && next) {
        prev.onclick = () => {
            currentTestimonioIndex = (currentTestimonioIndex - 1 + testimoniosData.length) % testimoniosData.length;
            renderTestimonio(currentTestimonioIndex);
        };
        next.onclick = () => {
            currentTestimonioIndex = (currentTestimonioIndex + 1) % testimoniosData.length;
            renderTestimonio(currentTestimonioIndex);
        };
    }
}

// ========== RESERVAS ==========
function initReservationForm() {
    const form = document.getElementById('reservationForm');
    if (!form) return;
    
    const fechaInput = document.getElementById('fecha');
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.min = today;
    }
    
    const telefonoInput = document.getElementById('telefono');
    if (telefonoInput && !telefonoInput.value) telefonoInput.value = '+53 ';
    telefonoInput.addEventListener('input', function() {
        if (!this.value.startsWith('+53 ')) {
            this.value = '+53 ' + this.value.replace(/^\+53\s?/, '');
        }
    });
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombre').value.trim();
        let telefono = document.getElementById('telefono').value.trim();
        const fecha = document.getElementById('fecha').value;
        const hora = document.getElementById('hora').value;
        const servicios = Array.from(document.querySelectorAll('input[name="servicio"]:checked')).map(cb => cb.value);
        const notas = document.getElementById('notas').value.trim();
        const statusDiv = document.getElementById('formStatus');
        
        if (!nombre || !telefono || !fecha || !hora || servicios.length === 0) {
            showFormStatus(statusDiv, 'Completa todos los campos y selecciona al menos un servicio', 'error');
            return;
        }
        if (!telefono.startsWith('+53')) telefono = '+53 ' + telefono;
        const phonePattern = /^\+53\s?[0-9]{8}$/;
        if (!phonePattern.test(telefono)) {
            showFormStatus(statusDiv, 'Teléfono debe tener formato +53 seguido de 8 dígitos', 'error');
            return;
        }
        
        showFormStatus(statusDiv, 'Guardando reserva...', 'loading');
        
        const { error } = await window.supabase.from('reservas').insert([{
            nombre,
            telefono,
            fecha,
            hora,
            servicios: servicios.join(', '),
            notas,
            estado: 'pendiente'
        }]);
        
        if (error) {
            showFormStatus(statusDiv, 'Error al guardar: ' + error.message, 'error');
        } else {
            showFormStatus(statusDiv, '¡Reserva creada! Te contactaremos pronto.', 'success');
            form.reset();
            document.querySelectorAll('input[name="servicio"]').forEach(cb => cb.checked = false);
            document.getElementById('telefono').value = '+53 ';
            const mensaje = `Hola, soy ${nombre}. Quiero reservar los servicios: ${servicios.join(', ')} para el ${fecha} a las ${hora}. Mi teléfono: ${telefono}`;
            window.open(`https://wa.me/5351234567?text=${encodeURIComponent(mensaje)}`, '_blank');
        }
    };
}

// ========== FAVORITOS ==========
function loadFavoritosFromStorage() {
    const saved = localStorage.getItem('peluqueria_favoritos');
    if (saved) {
        favoritos = new Set(JSON.parse(saved));
    }
}

function saveFavoritosToStorage() {
    localStorage.setItem('peluqueria_favoritos', JSON.stringify([...favoritos]));
}

// ========== NAVEGACIÓN Y EFECTOS ==========
function initNavigation() {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.querySelector('.nav-links');
    const navActions = document.querySelector('.nav-actions');
    
    if (menuToggle) {
        menuToggle.onclick = () => {
            const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
            menuToggle.setAttribute('aria-expanded', !expanded);
            navLinks.classList.toggle('active');
            navActions.classList.toggle('active');
        };
    }
    
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.onclick = () => {
            navLinks.classList.remove('active');
            navActions.classList.remove('active');
            if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
        };
    });
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

function initScrollEffects() {
    const heroNav = document.querySelector('.hero-nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            heroNav.style.background = 'rgba(0,0,0,0.5)';
            heroNav.style.backdropFilter = 'blur(10px)';
        } else {
            heroNav.style.background = 'rgba(0,0,0,0.2)';
            heroNav.style.backdropFilter = 'none';
        }
    });
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.feature, .product-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}