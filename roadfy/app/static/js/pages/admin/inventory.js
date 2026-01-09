// Panel Admin - Gestión de Inventario
async function renderAdminInventory() {
    if (!auth.isAuthenticated() || (!auth.isSuperAdmin() && !auth.isBusinessAdmin())) {
        router.navigate('/');
        return;
    }

    const user = auth.getCurrentUser();
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="container">
            <div class="card">
                <div class="flex-between" style="margin-bottom: 2rem;">
                    <div>
                        <h1 style="margin-bottom: 0.5rem;">Gestión de Inventario</h1>
                        ${user.business_id ? `
                            <a href="/admin/dashboard" data-link style="color: var(--text-secondary); text-decoration: none;">
                                <i class="fas fa-arrow-left"></i> Volver al Panel
                            </a>
                        ` : ''}
                    </div>
                    <button onclick="showAddInventoryForm()" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Agregar Item
                    </button>
                </div>
                
                <div id="inventory-form-container"></div>
                <div id="inventory-list-container" class="loading">
                    <i class="fas fa-spinner"></i> Cargando inventario...
                </div>
            </div>
        </div>
    `;

    loadInventory(user.business_id);
}

async function loadInventory(businessId) {
    try {
        const params = businessId ? `?business_id=${businessId}` : '';
        const inventory = await api.get(`/inventory${params}`);
        const container = document.getElementById('inventory-list-container');
        
        if (inventory.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 3rem;">No hay items en el inventario</p>';
            return;
        }

        // Calcular estadísticas
        const totalItems = inventory.length;
        const totalStock = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const totalValue = inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
        const lowStockItems = inventory.filter(item => (item.quantity || 0) < 10);

        // Obtener información de llantas
        const tiresData = await Promise.all(
            inventory.map(item => api.get(`/tires/${item.tire_id}`).catch(() => null))
        );

        container.innerHTML = `
            <!-- Estadísticas -->
            <div class="grid grid-4" style="margin-bottom: 2rem;">
                <div class="card" style="background: var(--primary-color); color: white; text-align: center; padding: 1rem;">
                    <h3 style="margin: 0; font-size: 1.5rem;">${totalItems}</h3>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">Productos</p>
                </div>
                <div class="card" style="background: var(--success-color); color: white; text-align: center; padding: 1rem;">
                    <h3 style="margin: 0; font-size: 1.5rem;">${totalStock}</h3>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">Unidades</p>
                </div>
                <div class="card" style="background: var(--warning-color); color: white; text-align: center; padding: 1rem;">
                    <h3 style="margin: 0; font-size: 1.5rem;">S/ ${totalValue.toFixed(2)}</h3>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">Valor Total</p>
                </div>
                <div class="card" style="background: ${lowStockItems.length > 0 ? 'var(--danger-color)' : 'var(--info-color)'}; color: white; text-align: center; padding: 1rem;">
                    <h3 style="margin: 0; font-size: 1.5rem;">${lowStockItems.length}</h3>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">Bajo Stock</p>
                </div>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Llanta</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${inventory.map((item, index) => {
                            const tire = tiresData[index];
                            const quantity = item.quantity || 0;
                            const price = item.price || 0;
                            const total = quantity * price;
                            const isLowStock = quantity < 10;
                            
                            return `
                                <tr style="${isLowStock ? 'background: rgba(220, 53, 69, 0.1);' : ''}">
                                    <td>
                                        ${tire ? `${tire.brand} ${tire.model} - ${tire.size.width}/${tire.size.aspectRatio}R${tire.size.diameter}` : `Llanta #${item.tire_id}`}
                                    </td>
                                    <td style="text-align: center;">
                                        <span style="color: ${isLowStock ? 'var(--danger-color)' : 'var(--text-color)'}; font-weight: ${isLowStock ? 'bold' : 'normal'};">
                                            ${quantity}
                                        </span>
                                    </td>
                                    <td style="font-weight: 600; color: var(--primary-color);">S/ ${price.toFixed(2)}</td>
                                    <td style="font-weight: bold; color: var(--success-color);">S/ ${total.toFixed(2)}</td>
                                    <td style="text-align: center;">
                                        ${isLowStock ? 
                                            '<span style="color: var(--danger-color);"><i class="fas fa-exclamation-triangle"></i> Bajo Stock</span>' : 
                                            '<span style="color: var(--success-color);"><i class="fas fa-check"></i> OK</span>'}
                                    </td>
                                    <td>
                                        <button onclick="editInventoryItem('${item.id}', '${item.tire_id}')" 
                                                class="btn btn-secondary" style="padding: 0.5rem 1rem; margin-right: 0.5rem;">
                                            <i class="fas fa-edit"></i> Editar
                                        </button>
                                        <button onclick="deleteInventoryItem('${item.id}')" 
                                                class="btn btn-danger" style="padding: 0.5rem 1rem;">
                                            <i class="fas fa-trash"></i> Eliminar
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        document.getElementById('inventory-list-container').innerHTML = 
            `<div class="alert alert-error">Error al cargar inventario: ${error.message}</div>`;
    }
}

let editingInventoryId = null;

// Funciones globales para inventario
window.showAddInventoryForm = async function() {
    editingInventoryId = null;
    const container = document.getElementById('inventory-form-container');
    container.innerHTML = `
        <div class="card" style="background: var(--bg-secondary); margin-bottom: 2rem;">
            <h2 style="margin-bottom: 1rem;">Agregar Item al Inventario</h2>
            <div id="tire-selector-loading" class="loading">
                <i class="fas fa-spinner"></i> Cargando llantas...
            </div>
            <form id="add-inventory-form" onsubmit="saveInventoryItem(event)" style="display: none;">
                <div class="form-group">
                    <label class="form-label">Llanta *</label>
                    <select id="inventory-tire-id" class="form-select" required>
                        <option value="">Selecciona una llanta</option>
                    </select>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label class="form-label">Cantidad *</label>
                        <input type="number" id="inventory-quantity" class="form-input" required min="0" value="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Precio (S/) *</label>
                        <input type="number" id="inventory-price" class="form-input" required min="0" step="0.01">
                    </div>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">Guardar</button>
                    <button type="button" onclick="cancelInventoryEdit()" class="btn btn-secondary" style="margin-left: 0.5rem;">
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Aplicar validación de formulario
    setTimeout(() => {
        const form = document.getElementById('add-inventory-form');
        if (form && window.formValidation) {
            window.formValidation.setupFormValidation(form);
        }
    }, 100);
    
    // Cargar llantas disponibles
    try {
        const tires = await api.get('/tires?limit=1000');
        const select = document.getElementById('inventory-tire-id');
        tires.forEach(tire => {
            const option = document.createElement('option');
            option.value = tire.id;
            option.textContent = `${tire.brand} ${tire.model} - ${tire.size.width}/${tire.size.aspectRatio}R${tire.size.diameter} (${tire.type})`;
            select.appendChild(option);
        });
        document.getElementById('tire-selector-loading').style.display = 'none';
        document.getElementById('add-inventory-form').style.display = 'block';
    } catch (error) {
        document.getElementById('tire-selector-loading').innerHTML = 
            `<div class="alert alert-error">Error al cargar llantas: ${error.message}</div>`;
    }
}

window.editInventoryItem = async function(inventoryId, tireId) {
    editingInventoryId = inventoryId;
    try {
        const item = await api.get(`/inventory/${inventoryId}`);
        const container = document.getElementById('inventory-form-container');
        
        container.innerHTML = `
            <div class="card" style="background: var(--bg-secondary); margin-bottom: 2rem;">
                <h2 style="margin-bottom: 1rem;">Editar Item de Inventario</h2>
                <form onsubmit="saveInventoryItem(event)">
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label class="form-label">ID de Llanta *</label>
                            <input type="text" id="inventory-tire-id" class="form-input" value="${tireId}" required readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Cantidad *</label>
                            <input type="number" id="inventory-quantity" class="form-input" value="${item.quantity}" required min="0">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Precio (S/) *</label>
                            <input type="number" id="inventory-price" class="form-input" value="${item.price}" required min="0" step="0.01">
                        </div>
                    </div>
                    <div class="form-group">
                        <button type="submit" class="btn btn-primary">Actualizar</button>
                        <button type="button" onclick="cancelInventoryEdit()" class="btn btn-secondary" style="margin-left: 0.5rem;">
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
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

window.cancelInventoryEdit = function() {
    editingInventoryId = null;
    document.getElementById('inventory-form-container').innerHTML = '';
}

window.saveInventoryItem = async function(event) {
    event.preventDefault();
    const user = auth.getCurrentUser();
    const data = {
        tire_id: document.getElementById('inventory-tire-id').value,
        quantity: parseInt(document.getElementById('inventory-quantity').value),
        price: parseFloat(document.getElementById('inventory-price').value),
        business_id: user.business_id
    };

    try {
        if (editingInventoryId) {
            await api.put(`/inventory/${editingInventoryId}`, data);
            alert('Item actualizado correctamente');
        } else {
            await api.post('/inventory', data);
            alert('Item agregado correctamente');
        }
        
        editingInventoryId = null;
        document.getElementById('inventory-form-container').innerHTML = '';
        loadInventory(user.business_id);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

window.deleteInventoryItem = async function(inventoryId) {
    if (!confirm('¿Estás seguro de eliminar este item del inventario?')) return;
    
    try {
        await api.delete(`/inventory/${inventoryId}`);
        alert('Item eliminado correctamente');
        const user = auth.getCurrentUser();
        loadInventory(user.business_id);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}
