// Página de Solicitud de Negocio
function renderRequestBusiness() {
    const main = document.getElementById('main-content');

    main.innerHTML = `
        <div class="container" style="max-width: 600px;">
            <div class="card">
                <h1 style="text-align: center; margin-bottom: 2rem;">Solicitar Registro de Negocio</h1>
                
                <div id="request-alert"></div>
                
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem; text-align: center;">
                    Completa el formulario para solicitar el registro de tu negocio de llantas.
                    Un administrador revisará tu solicitud.
                </p>
                
                <form id="request-form" onsubmit="handleRequestBusiness(event)">
                    <div class="form-group">
                        <label class="form-label">Nombre del Negocio *</label>
                        <input type="text" id="business-name" class="form-input" required 
                               placeholder="Ej: Llantas Express">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Dirección *</label>
                        <input type="text" id="address" class="form-input" required 
                               placeholder="Ej: Av. Principal 123">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Teléfono *</label>
                        <input type="tel" id="phone" class="form-input" required 
                               placeholder="Ej: +51 999 999 999"
                               pattern="[0-9+\-() ]+"
                               title="Solo números y símbolos: +, -, espacios, paréntesis">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Email de Contacto *</label>
                        <input type="email" id="email" class="form-input" required 
                               placeholder="contacto@negocio.com">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Horarios *</label>
                        <input type="text" id="hours" class="form-input" required 
                               placeholder="Ej: Lun-Vie: 9:00-18:00">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Descripción</label>
                        <textarea id="description" class="form-textarea" rows="4" 
                                  placeholder="Describe tu negocio..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <button type="submit" class="btn btn-primary" style="width: 100%;">
                            <i class="fas fa-paper-plane"></i> Enviar Solicitud
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Aplicar validación de formulario
    setTimeout(() => {
        const form = document.getElementById('request-form');
        if (form && window.formValidation) {
            window.formValidation.setupFormValidation(form);
        }
    }, 100);
}

// Función global para solicitar negocio
window.handleRequestBusiness = async function(event) {
    event.preventDefault();
    const alertDiv = document.getElementById('request-alert');
    
    const data = {
        businessName: document.getElementById('business-name').value,
        address: document.getElementById('address').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        hours: document.getElementById('hours').value,
        description: document.getElementById('description').value
    };
    
    // Validaciones básicas
    if (!data.businessName || !data.address || !data.phone || !data.email || !data.hours) {
        alertDiv.innerHTML = '<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> Por favor completa todos los campos obligatorios</div>';
        return;
    }
    
    alertDiv.innerHTML = '<div class="alert alert-info"><i class="fas fa-spinner"></i> Enviando solicitud...</div>';
    
    try {
        console.log('Sending business request:', data);
        const response = await api.post('/auth/request-business', data);
        console.log('Business request response:', response);
        
        alertDiv.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check"></i> 
                ¡Solicitud enviada correctamente! El superadmin la revisará y te contactará.
            </div>
        `;
        
        document.getElementById('request-form').reset();
    } catch (error) {
        console.error('Error requesting business:', error);
        alertDiv.innerHTML = `<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> Error: ${error.message}</div>`;
    }
}

