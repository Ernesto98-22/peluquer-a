// app.js - Paso Firme (versión boutique con X para cerrar menú y número actualizado)
(function() {
    'use strict';
    
    const supabase = window.supabase;
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
        if (!supabase) {
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
        loadFavoritosFromStorage();
        initReservationForm(); // Añadido para manejar el teléfono en reservas
    });
    
    function mostrarErrorGlobal(msg) {
        const div = document.createElement('div');
        div.className = 'global-error';
        div.innerHTML = `<div style="background:#fee2e2; color:#991b1b; padding:1rem; margin:1rem; border-radius:12px; text-align:center;">${msg}</div>`;
        document.body.prepend(div);
        setTimeout(() => div.remove(), 5000);
    }
    
    // ========== NAVEGACIÓN MÓVIL (con botón de cierre) ==========
    function initNavigation() {
        const menuToggle = document.getElementById('menuToggle');
        const menuCloseBtn = document.getElementById('menuCloseBtn');
        const navLinks = document.getElementById('navLinks');
        const navActions = document.getElementById('navActions');
        
        if (menuToggle && navLinks && navActions) {
            menuToggle.addEventListener('click', () => {
                const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
                menuToggle.setAttribute('aria-expanded', !expanded);
                navLinks.classList.toggle('active');
                navActions.classList.toggle('active');
                if (menuCloseBtn) menuCloseBtn.style.display = 'block';
                if (!expanded) {
                    document.body.style.overflow = 'hidden';
                } else {
                    document.body.style.overflow = '';
                }
            });
            
            // Cerrar con la X
            if (menuCloseBtn) {
                menuCloseBtn.addEventListener('click', () => {
                    navLinks.classList.remove('active');
                    navActions.classList.remove('active');
                    menuToggle.setAttribute('aria-expanded', 'false');
                    document.body.style.overflow = '';
                    menuCloseBtn.style.display = 'none';
                });
            }
            
            // Cerrar menú al hacer clic en un enlace
            document.querySelectorAll('.nav-links a').forEach(link => {
                link.addEventListener('click', () => {
                    navLinks.classList.remove('active');
                    navActions.classList.remove('active');
                    menuToggle.setAttribute('aria-expanded', 'false');
                    document.body.style.overflow = '';
                    if (menuCloseBtn) menuCloseBtn.style.display = 'none';
                });
            });
        }
        
        // Smooth scroll para enlaces internos
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href !== '#') {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) target.scrollIntoView({ behavior: 'smooth' });
                    // Cerrar menú si está abierto
                    if (navLinks && navLinks.classList.contains('active')) {
                        navLinks.classList.remove('active');
                        navActions.classList.remove('active');
                        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
                        document.body.style.overflow = '';
                        if (menuCloseBtn) menuCloseBtn.style.display = 'none';
                    }
                }
            });
        });
    }
    
    // ========== AUTENTICACIÓN (sin cambios en la lógica) ==========
    async function checkSession() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            currentUser = session.user;
            currentUserId = session.user.id;
            currentUsername = session.user.user_metadata?.username || session.user.email.split('@')[0];
            
            const { data: adminData } = await supabase
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
                    window.open('https://wa.me/5355555555?text=Hola,%20quiero%20comprar%20en%20Paso%20Firme', '_blank');
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
            const { error } = await supabase.auth.signInWithPassword({ email, password });
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
            // No forzamos el prefijo +53, solo validamos si el usuario lo dejó
            // El campo ya trae '+53 ' por defecto desde el HTML
            const userEmail = email ? email : phone.replace(/\s/g, '') + '@temp.local';
            const { error } = await supabase.auth.signUp({
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
                    // Restaurar el prefijo +53 después de resetear el formulario
                    document.getElementById('registerPhone').value = '+53 ';
                }, 2000);
            }
        };
    }
    
    function toggleModal(show) {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.toggle('active', show);
            document.body.style.overflow = show ? 'hidden' : '';
        }
    }
    
    function showFormStatus(element, message, type) {
        element.textContent = message;
        element.className = `form-status ${type}`;
        setTimeout(() => {
            element.textContent = '';
            element.className = 'form-status';
        }, 3000);
    }
    
    // ========== RESERVAS (con prefijo +53 por defecto y número de WhatsApp actualizado) ==========
    function initReservationForm() {
        const form = document.getElementById('reservationForm');
        if (!form) return;
        
        const fechaInput = document.getElementById('fecha');
        if (fechaInput) {
            const today = new Date().toISOString().split('T')[0];
            fechaInput.min = today;
        }
        
        // Configurar teléfono con prefijo +53 por defecto (solo si no tiene valor)
        const telefonoInput = document.getElementById('telefono');
        if (telefonoInput && (!telefonoInput.value || telefonoInput.value === '')) {
            telefonoInput.value = '+53 ';
        }
        
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
            
            showFormStatus(statusDiv, 'Guardando reserva...', 'loading');
            
            const { error } = await supabase.from('reservas').insert([{
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
                if (telefonoInput) telefonoInput.value = '+53 ';
                const mensaje = `Hola, soy ${nombre}. Quiero reservar los servicios: ${servicios.join(', ')} para el ${fecha} a las ${hora}. Mi teléfono: ${telefono}`;
                // Número de WhatsApp actualizado
                window.open(`https://wa.me/5355555555?text=${encodeURIComponent(mensaje)}`, '_blank');
            }
        };
    }
    
    // ========== PRODUCTOS (número de WhatsApp actualizado) ==========
    async function loadProducts() {
        const { data, error } = await supabase.from('productos').select('*');
        if (error) {
            console.error('Error cargando productos:', error);
            productsData = getFallbackProducts();
        } else if (data && data.length > 0) {
            productsData = data;
        } else {
            productsData = getFallbackProducts();
        }
        renderProducts(currentCategory);
    }
    
    function getFallbackProducts() {
        return [
            { id: 1, nombre: 'Camisa Oxford Azul', precio: 4500, categoria: 'camisas', imagen_url: 'https://placehold.co/400x400/EEE/555?text=Camisa+Azul' },
            { id: 2, nombre: 'Pantalón Gris Formal', precio: 6500, categoria: 'pantalones', imagen_url: 'https://placehold.co/400x400/EEE/555?text=Pantalon+Gris' },
            { id: 3, nombre: 'Short Beige Casual', precio: 3500, categoria: 'shorts', imagen_url: 'https://placehold.co/400x400/EEE/555?text=Short+Beige' },
            { id: 4, nombre: 'Sneakers Blancos', precio: 8500, categoria: 'zapatos', imagen_url: 'https://placehold.co/400x400/EEE/555?text=Sneakers' },
            { id: 5, nombre: 'Conjunto Niña Amarillo', precio: 4200, categoria: 'ninos', imagen_url: 'https://placehold.co/400x400/EEE/555?text=Conjunto+Niño' }
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
                        window.open(`https://wa.me/5355555555?text=${encodeURIComponent(mensaje)}`, '_blank');
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
    
    // ========== TESTIMONIOS (sin cambios) ==========
    async function loadTestimonios() {
        const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('approved', true)
            .order('created_at', { ascending: false });
        
        if (error || !data || data.length === 0) {
            testimoniosData = [
                { nombre_usuario: "María G.", comentario: "Excelente calidad y atención. Los zapatos son increíbles.", rating: 5 },
                { nombre_usuario: "Carlos R.", comentario: "La ropa es de primera, volveré a comprar.", rating: 4 },
                { nombre_usuario: "Ana L.", comentario: "Diseños únicos, me encanta su estilo.", rating: 5 }
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
    
    // ========== FAVORITOS ==========
    function loadFavoritosFromStorage() {
        const saved = localStorage.getItem('pasofirme_favoritos');
        if (saved) {
            favoritos = new Set(JSON.parse(saved));
        }
    }
    
    function saveFavoritosToStorage() {
        localStorage.setItem('pasofirme_favoritos', JSON.stringify([...favoritos]));
    }
    
    // ========== EFECTOS DE SCROLL ==========
    function initScrollEffects() {
        const heroNav = document.querySelector('.hero-nav');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                heroNav.style.background = 'rgba(0,0,0,0.9)';
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
})();