document.addEventListener('DOMContentLoaded', function() {
    // Habilitar/Deshabilitar la pregunta condicional de duración según tabaquismo
    const smokingStatusRadios = document.querySelectorAll('input[name="smokingStatus"]');
    const smokingDurationRadios = document.querySelectorAll('input[name="smokingDuration"]');
    const toggleSmokingDurationRequired = () => {
        const selected = document.querySelector('input[name="smokingStatus"]:checked');
        const isNever = selected && selected.value === 'nunca';
        smokingDurationRadios.forEach(r => {
            r.required = !isNever;
            if (isNever) r.checked = false;
        });
    };
    if (smokingStatusRadios.length) {
        smokingStatusRadios.forEach(r => r.addEventListener('change', toggleSmokingDurationRequired));
        toggleSmokingDurationRequired();
    }
    const formSteps = document.querySelectorAll('.form-step');
    let currentStep = 0;

    // --- Funciones de Utilidad y Validaciones Específicas ---

    const markAsInvalid = (field, message) => {
        field.classList.add('border-red-500');
        field.classList.remove('border-green-500');
        let errorMsg = field.parentNode.querySelector('.error-message');
        if (!errorMsg) {
            errorMsg = document.createElement('span');
            errorMsg.className = 'error-message text-red-500 text-sm mt-1 block';
            field.parentNode.appendChild(errorMsg);
        }
        errorMsg.textContent = message;
    };

    const markAsValid = (field) => {
        field.classList.remove('border-red-500');
        field.classList.add('border-green-500');
        const errorMsg = field.parentNode.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    };

    const markRadioGroupAsInvalid = (groupName) => {
        const container = document.querySelector(`input[name="${groupName}"]`).closest('div');
        let errorMsg = container.querySelector('.error-message');
        if (!errorMsg) {
            errorMsg = document.createElement('span');
            errorMsg.className = 'error-message text-red-500 text-sm mt-1 block';
            errorMsg.textContent = 'Seleccione una opción.';
            container.appendChild(errorMsg);
        }
    };

    const markRadioGroupAsValid = (groupName) => {
        const container = document.querySelector(`input[name="${groupName}"]`).closest('div');
        const errorMsg = container.querySelector('.error-message');
        if (errorMsg) errorMsg.remove();
    };

    const validateDNI = (input) => /^\d{7,8}$/.test(input.value);
    const validateBirthDate = (input) => {
        const dateRegex = /^(0[1-9]|[1-2][0-9]|3[0-1])\/(0[1-9]|1[0-2])\/\d{4}$/;
        if (!dateRegex.test(input.value)) return false;
        const [day, month, year] = input.value.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        const today = new Date();
        return date <= today && !isNaN(date.getTime()) && date.getDate() === day;
    };
    const validateEmail = (input) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value);
    const validatePhone = (input) => /^\d{10,11}$/.test(input.value.replace(/[\s()-]/g, ''));
    const validateHeight = (input) => {
        const height = parseFloat(input.value);
        return !isNaN(height) && height >= 50 && height <= 300;
    };
    const validateWeight = (input) => {
        const weight = parseFloat(input.value);
        return !isNaN(weight) && weight >= 10 && weight <= 300;
    };

    // --- Funciones del Formulario ---

    const validateAndMarkFields = () => {
        const currentStepElement = formSteps[currentStep];
        let isValid = true;

        // Validar campos de texto y select
        const requiredInputs = currentStepElement.querySelectorAll(`
            input[required]:not([type="radio"]), 
            select[required],
            textarea[required]
        `);
        
        requiredInputs.forEach(input => {
            let fieldIsValid = true;
            if (!input.value.trim()) {
                markAsInvalid(input, 'Este campo es obligatorio.');
                fieldIsValid = false;
            } else {
                switch (input.id) {
                    case 'dni':
                        if (!validateDNI(input)) { markAsInvalid(input, 'El DNI debe tener 7 u 8 dígitos.'); fieldIsValid = false; }
                        break;
                    case 'birthDate':
                        if (!validateBirthDate(input)) { markAsInvalid(input, 'Formato o fecha inválida (dd/mm/yyyy).'); fieldIsValid = false; }
                        break;
                    case 'email':
                        if (!validateEmail(input)) { markAsInvalid(input, 'Formato de correo inválido.'); fieldIsValid = false; }
                        break;
                    case 'phone':
                        if (!validatePhone(input)) { markAsInvalid(input, 'Formato de teléfono inválido (10-11 dígitos).'); fieldIsValid = false; }
                        break;
                    case 'height':
                        if (!validateHeight(input)) { markAsInvalid(input, 'Altura debe ser entre 50 y 300 cm.'); fieldIsValid = false; }
                        break;
                    case 'weight':
                        if (!validateWeight(input)) { markAsInvalid(input, 'Peso debe ser entre 10 y 300 kg.'); fieldIsValid = false; }
                        break;
                }
            }
            if (fieldIsValid) {
                markAsValid(input);
            }
            if (!fieldIsValid) {
                isValid = false;
            }
        });

        // Validar grupos de radio buttons (a partir del paso 3)
        if (currentStep >= 2) {
            const radioGroups = new Set();
            currentStepElement.querySelectorAll('input[type="radio"]').forEach(radio => {
                const groupName = radio.name;
                if (groupName) radioGroups.add(groupName);
            });
            
            radioGroups.forEach(groupName => {
                const checkedRadio = document.querySelector(`input[name="${groupName}"]:checked`);
                const smokingStatus = document.querySelector('input[name="smokingStatus"]:checked');
                
                // Excepción para "duración de fumador" si "nunca fumó"
                if (groupName === 'smokingDuration' && smokingStatus && smokingStatus.value === 'nunca') {
                    markRadioGroupAsValid(groupName);
                    return;
                }
                
                if (!checkedRadio) {
                    markRadioGroupAsInvalid(groupName);
                    isValid = false;
                } else {
                    markRadioGroupAsValid(groupName);
                }
            });
        }
        
        return isValid;
    };

    const showStep = (step) => {
        formSteps.forEach((s, index) => {
            s.classList.toggle('hidden', index !== step);
        });
        updateProgress();
        updateNavigationButtons();
    };

    const updateProgress = () => {
        const progress = document.getElementById('formProgress');
        if (progress) {
            progress.style.width = `${((currentStep + 1) / formSteps.length) * 100}%`;
        }
    };
    
    const updateNavigationButtons = () => {
        const nextButtons = document.querySelectorAll('[id^="nextBtn"]');
        nextButtons.forEach(btn => {
            btn.disabled = !validateAndMarkFields();
        });
    };

    // --- Event Listeners ---

    document.querySelectorAll('[id^="nextBtn"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!validateAndMarkFields()) {
                e.preventDefault();
                return;
            }
            currentStep++;
            showStep(currentStep);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    document.querySelectorAll('[id^="prevBtn"]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep--;
                showStep(currentStep);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });

    document.querySelectorAll('input, select, textarea').forEach(field => {
        field.addEventListener('input', updateNavigationButtons);
        if (field.type === 'radio') {
            field.addEventListener('change', updateNavigationButtons);
        }
    });

    // --- Inicialización ---

    showStep(currentStep);
});