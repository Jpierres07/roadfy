// Panel Admin - Gestión de Llantas
async function renderAdminTires() {
    if (!auth.isAuthenticated() || !auth.isSuperAdmin()) {
        router.navigate('/');
        return;
    }

    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="container">
            <div class="card">
                <div class="flex-between" style="margin-bottom: 2rem;">
                    <h1>Gestión de Llantas</h1>
                    <button onclick="showAddTireForm()" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Agregar Llanta
                    </button>
                </div>
                
                <div id="tire-form-container"></div>
                <div id="tires-list-container" class="loading">
                    <i class="fas fa-spinner"></i> Cargando llantas...
                </div>
            </div>
        </div>
    `;

    loadAdminTires();
}

async function loadAdminTires() {
    try {
        const tires = await api.get('/tires');
        const container = document.getElementById('tires-list-container');
        
        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Imagen</th>
                            <th>Marca</th>
                            <th>Modelo</th>
                            <th>Tamaño</th>
                            <th>Tipo</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tires.map(tire => `
                            <tr>
                                <td>
                                    <img src="${tire.imageUrl || 'https://placehold.co/100x100'}" 
                                         alt="${tire.brand}" 
                                         style="width: 80px; height: 80px; object-fit: cover; border-radius: var(--radius);"
                                         onerror="this.src='https://placehold.co/100x100'">
                                </td>
                                <td>${tire.brand}</td>
                                <td>${tire.model}</td>
                                <td>${tire.size.width}/${tire.size.aspectRatio}R${tire.size.diameter}</td>
                                <td>${tire.type}</td>
                                <td>
                                    <button onclick="editTire('${tire.id}')" class="btn btn-secondary" style="padding: 0.5rem 1rem; margin-right: 0.5rem;">
                                        <i class="fas fa-edit"></i> Editar
                                    </button>
                                    <button onclick="deleteTire('${tire.id}')" class="btn btn-danger" style="padding: 0.5rem 1rem;">
                                        <i class="fas fa-trash"></i> Eliminar
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        document.getElementById('tires-list-container').innerHTML = 
            `<div class="alert alert-error">Error al cargar llantas: ${error.message}</div>`;
    }
}

// Funciones globales para gestión de llantas
window.showAddTireForm = function() {
    const container = document.getElementById('tire-form-container');
    container.innerHTML = `
        <div class="card" style="background: var(--bg-secondary); margin-bottom: 2rem;">
            <h2 style="margin-bottom: 1rem;">Agregar Nueva Llanta</h2>
            <form onsubmit="saveTire(event)">
                <div class="grid grid-2">
                    <div class="form-group">
                        <label class="form-label">Marca *</label>
                        <input type="text" id="tire-brand" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Modelo *</label>
                        <input type="text" id="tire-model" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ancho *</label>
                        <input type="number" id="tire-width" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Perfil *</label>
                        <input type="number" id="tire-aspect-ratio" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Diámetro *</label>
                        <input type="number" id="tire-diameter" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tipo *</label>
                        <select id="tire-type" class="form-select" required>
                            <option value="">Selecciona un tipo</option>
                            <option value="Pista / Carretera (H/T)">Pista / Carretera (H/T)</option>
                            <option value="Uso Mixto (A/T)">Uso Mixto (A/T)</option>
                            <option value="Todo Terreno (M/T)">Todo Terreno (M/T)</option>
                            <option value="Deportiva (UHP)">Deportiva (UHP)</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">URL de Imagen</label>
                    <input type="url" id="tire-image-url" class="form-input"
                           pattern="https?://.+"
                           title="La URL debe comenzar con http:// o https://">
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">Guardar</button>
                    <button type="button" onclick="document.getElementById('tire-form-container').innerHTML = ''" 
                            class="btn btn-secondary" style="margin-left: 0.5rem;">
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Aplicar validación de formulario
    setTimeout(() => {
        const form = container.querySelector('form');
        if (form && window.formValidation) {
            window.formValidation.setupFormValidation(form);
        }
    }, 100);
}

let editingTireId = null;

window.editTire = async function(tireId) {
    editingTireId = tireId;
    try {
        const tire = await api.get(`/tires/${tireId}`);
        const container = document.getElementById('tire-form-container');
        
        container.innerHTML = `
            <div class="card" style="background: var(--bg-secondary); margin-bottom: 2rem;">
                <h2 style="margin-bottom: 1rem;">Editar Llanta</h2>
                <form onsubmit="saveTire(event)">
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label class="form-label">Marca *</label>
                            <input type="text" id="tire-brand" class="form-input" value="${tire.brand}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Modelo *</label>
                            <input type="text" id="tire-model" class="form-input" value="${tire.model}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Ancho *</label>
                            <input type="number" id="tire-width" class="form-input" value="${tire.size.width}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Perfil *</label>
                            <input type="number" id="tire-aspect-ratio" class="form-input" value="${tire.size.aspectRatio}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Diámetro *</label>
                            <input type="number" id="tire-diameter" class="form-input" value="${tire.size.diameter}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tipo *</label>
                            <select id="tire-type" class="form-select" required>
                                <option value="">Selecciona un tipo</option>
                                <option value="Pista / Carretera (H/T)">Pista / Carretera (H/T)</option>
                                <option value="Uso Mixto (A/T)">Uso Mixto (A/T)</option>
                                <option value="Todo Terreno (M/T)">Todo Terreno (M/T)</option>
                                <option value="Deportiva (UHP)">Deportiva (UHP)</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">URL de Imagen</label>
                        <input type="url" id="tire-image-url" class="form-input" value="${tire.imageUrl || ''}"
                               pattern="https?://.+"
                               title="La URL debe comenzar con http:// o https://">
                    </div>
                    <div class="form-group">
                        <button type="submit" class="btn btn-primary">Actualizar</button>
                        <button type="button" onclick="cancelEdit()" class="btn btn-secondary" style="margin-left: 0.5rem;">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.getElementById('tire-type').value = tire.type;
        
        // Aplicar validación de formulario
        setTimeout(() => {
            const form = container.querySelector('form');
            if (form && window.formValidation) {
                window.formValidation.setupFormValidation(form);
            }
        }, 100);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

window.cancelEdit = function() {
    editingTireId = null;
    document.getElementById('tire-form-container').innerHTML = '';
}

window.saveTire = async function(event) {
    event.preventDefault();
    const data = {
        brand: document.getElementById('tire-brand').value,
        model: document.getElementById('tire-model').value,
        size: {
            width: parseInt(document.getElementById('tire-width').value),
            aspectRatio: parseInt(document.getElementById('tire-aspect-ratio').value),
            diameter: parseInt(document.getElementById('tire-diameter').value)
        },
        type: document.getElementById('tire-type').value,
        imageUrl: document.getElementById('tire-image-url').value || null
    };

    try {
        if (editingTireId) {
            await api.put(`/tires/${editingTireId}`, data);
            alert('Llanta actualizada correctamente');
        } else {
            await api.post('/tires', data);
            alert('Llanta creada correctamente');
        }
        
        editingTireId = null;
        document.getElementById('tire-form-container').innerHTML = '';
        loadAdminTires();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

window.deleteTire = async function(tireId) {
    if (!confirm('¿Estás seguro de eliminar esta llanta?')) return;
    
    try {
        await api.delete(`/tires/${tireId}`);
        alert('Llanta eliminada correctamente');
        loadAdminTires();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

