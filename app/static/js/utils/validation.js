/**
 * Utilidades de validación para formularios
 */

// Patrones de validación
const PATTERNS = {
    phone: /^[0-9+\-() ]+$/,  // Solo números, +, -, espacios, paréntesis
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    url: /^https?:\/\/.+/,
    number: /^[0-9]+(\.[0-9]+)?$/,
    positiveNumber: /^[0-9]+(\.[0-9]+)?$/
};

/**
 * Valida formato de teléfono
 */
function validatePhone(phone) {
    return PATTERNS.phone.test(phone);
}

/**
 * Valida formato de email
 */
function validateEmail(email) {
    return PATTERNS.email.test(email);
}

/**
 * Valida formato de URL
 */
function validateURL(url) {
    if (!url) return true; // URL opcional
    return PATTERNS.url.test(url);
}

/**
 * Valida número positivo
 */
function validatePositiveNumber(value) {
    if (!value) return true;
    return PATTERNS.positiveNumber.test(value) && parseFloat(value) >= 0;
}

/**
 * Aplica validación en tiempo real a un campo de teléfono
 */
function setupPhoneValidation(input) {
    if (!input) return;
    
    // Prevenir entrada de caracteres no permitidos
    input.addEventListener('input', function(e) {
        let value = e.target.value;
        // Permitir solo números, +, -, espacios, paréntesis
        value = value.replace(/[^0-9+\-() ]/g, '');
        e.target.value = value;
    });
    
    // Validar al perder el foco
    input.addEventListener('blur', function(e) {
        const value = e.target.value.trim();
        if (value && !validatePhone(value)) {
            e.target.setCustomValidity('El teléfono solo puede contener números y los símbolos: +, -, espacios, paréntesis');
            e.target.reportValidity();
        } else {
            e.target.setCustomValidity('');
        }
    });
    
    // Agregar atributo pattern para validación HTML5
    input.setAttribute('pattern', '[0-9+\\-() ]+');
    input.setAttribute('title', 'Solo números y símbolos: +, -, espacios, paréntesis');
}

/**
 * Aplica validación en tiempo real a un campo de email
 */
function setupEmailValidation(input) {
    if (!input) return;
    
    // Validar al perder el foco
    input.addEventListener('blur', function(e) {
        const value = e.target.value.trim();
        if (value && !validateEmail(value)) {
            e.target.setCustomValidity('Por favor ingresa un email válido');
            e.target.reportValidity();
        } else {
            e.target.setCustomValidity('');
        }
    });
}

/**
 * Aplica validación en tiempo real a un campo de URL
 */
function setupURLValidation(input) {
    if (!input) return;
    
    // Validar al perder el foco
    input.addEventListener('blur', function(e) {
        const value = e.target.value.trim();
        if (value && !validateURL(value)) {
            e.target.setCustomValidity('La URL debe comenzar con http:// o https://');
            e.target.reportValidity();
        } else {
            e.target.setCustomValidity('');
        }
    });
    
    // Agregar atributo pattern para validación HTML5
    input.setAttribute('pattern', 'https?://.+');
    input.setAttribute('title', 'La URL debe comenzar con http:// o https://');
}

/**
 * Aplica validación en tiempo real a un campo numérico
 */
function setupNumberValidation(input, min = 0, max = null, allowDecimal = false) {
    if (!input) return;
    
    // Prevenir entrada de caracteres no numéricos
    input.addEventListener('input', function(e) {
        let value = e.target.value;
        if (allowDecimal) {
            // Permitir números y un punto decimal
            value = value.replace(/[^0-9.]/g, '');
            // Solo permitir un punto
            const parts = value.split('.');
            if (parts.length > 2) {
                value = parts[0] + '.' + parts.slice(1).join('');
            }
        } else {
            // Solo números enteros
            value = value.replace(/[^0-9]/g, '');
        }
        e.target.value = value;
    });
    
    // Validar rango al perder el foco
    input.addEventListener('blur', function(e) {
        const value = parseFloat(e.target.value);
        if (isNaN(value)) {
            e.target.setCustomValidity('Debe ser un número válido');
            e.target.reportValidity();
            return;
        }
        
        if (value < min) {
            e.target.setCustomValidity(`El valor mínimo es ${min}`);
            e.target.reportValidity();
        } else if (max !== null && value > max) {
            e.target.setCustomValidity(`El valor máximo es ${max}`);
            e.target.reportValidity();
        } else {
            e.target.setCustomValidity('');
        }
    });
    
    // Agregar atributos min/max
    if (min !== null) input.setAttribute('min', min);
    if (max !== null) input.setAttribute('max', max);
    if (allowDecimal) input.setAttribute('step', '0.01');
}

/**
 * Aplica validación a todos los campos de un formulario
 */
function setupFormValidation(form) {
    if (!form) return;
    
    // Buscar todos los campos de teléfono
    const phoneInputs = form.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(setupPhoneValidation);
    
    // Buscar todos los campos de email
    const emailInputs = form.querySelectorAll('input[type="email"]');
    emailInputs.forEach(setupEmailValidation);
    
    // Buscar todos los campos de URL
    const urlInputs = form.querySelectorAll('input[type="url"]');
    urlInputs.forEach(setupURLValidation);
    
    // Buscar todos los campos numéricos
    const numberInputs = form.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        const min = input.hasAttribute('min') ? parseFloat(input.getAttribute('min')) : 0;
        const max = input.hasAttribute('max') ? parseFloat(input.getAttribute('max')) : null;
        const step = input.hasAttribute('step') ? parseFloat(input.getAttribute('step')) : 1;
        setupNumberValidation(input, min, max, step < 1);
    });
}

// Exportar funciones globalmente
window.formValidation = {
    validatePhone,
    validateEmail,
    validateURL,
    validatePositiveNumber,
    setupPhoneValidation,
    setupEmailValidation,
    setupURLValidation,
    setupNumberValidation,
    setupFormValidation
};
