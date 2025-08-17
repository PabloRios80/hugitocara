document.addEventListener('DOMContentLoaded', function() {
    const formSteps = document.querySelectorAll('.form-step');
    let currentStep = 0;

    
    // Función para validar todos los campos del paso actual
    const validateCurrentStep = () => {
        const currentStepElement = formSteps[currentStep];
        let isValid = true;

        // 1. Validar inputs de texto/select requeridos
        const requiredInputs = currentStepElement.querySelectorAll(`
            input[required]:not([type="radio"]), 
            select[required],
            textarea[required]
        `);
        
        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                markAsInvalid(input);
                isValid = false;
            } else {
                markAsValid(input);
            }
        });
 // 2. Validar TODOS los grupos de radio buttons en pasos 4, 5 y 6
    if (currentStep >= 3) { // Pasos 4, 5 y 6 (índices 3, 4 y 5)
        const radioGroups = {};
        currentStepElement.querySelectorAll('input[type="radio"]').forEach(radio => {
            const groupName = radio.name;
            radioGroups[groupName] = radioGroups[groupName] || 
                document.querySelector(`input[name="${groupName}"]:checked`);
        });

        for (const groupName in radioGroups) {
            if (!radioGroups[groupName]) {
                markRadioGroupAsInvalid(groupName);
                isValid = false;
            } else {
                markRadioGroupAsValid(groupName);
            }
        }
    }
    
        return isValid;
    };

    const markAsInvalid = (field) => {
        field.classList.add('border-red-500');
        field.classList.remove('border-green-500');
    
        // Buscar mensaje existente primero
        let errorMsg = field.parentNode.querySelector('.error-message');
    
        if (!errorMsg) {
            errorMsg = document.createElement('span');
            errorMsg.className = 'error-message text-red-500 text-sm mt-1 block';
            errorMsg.textContent = 'Campo obligatorio';
            field.parentNode.appendChild(errorMsg);
        }
    };

    const markAsValid = (field) => {
        field.classList.remove('border-red-500');
        field.classList.add('border-green-500');
    
        // Eliminar mensaje si existe
        const errorMsg = field.parentNode.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    };

    const markRadioGroupAsInvalid = (groupName) => {
        const firstRadio = document.querySelector(`input[name="${groupName}"]`);
        if (firstRadio) {
            const container = firstRadio.closest('div');
            if (container) {
                // Buscar mensaje existente primero
                let errorMsg = container.querySelector('.error-message');
            
                if (!errorMsg) {
                    errorMsg = document.createElement('span');
                    errorMsg.className = 'error-message text-red-500 text-sm mt-1 block';
                    errorMsg.textContent = 'Seleccione una opción';
                    container.appendChild(errorMsg);
                }
            }
        }
    };
    const markRadioGroupAsValid = (groupName) => {
        const firstRadio = document.querySelector(`input[name="${groupName}"]`);
        if (firstRadio) {
            const container = firstRadio.closest('div');
            if (container) {
                const errorMsg = container.querySelector('.error-message');
                if (errorMsg) errorMsg.remove();
            }
        }
    };
  // Mostrar paso actual
    const showStep = (step) => {
        formSteps.forEach((s, index) => {
            s.classList.toggle('hidden', index !== step);
        });
        
        updateProgress();
        updateNavigationButtons();
        
        // Nueva función para forzar validación al cambiar de paso
        validateOnStepChange();
    };

    
    // Nueva función para validar campos al mostrar el paso
    const validateOnStepChange = () => {
        const currentStepElement = formSteps[currentStep];
        
        // Validar inputs normales
        currentStepElement.querySelectorAll(`
            input[required]:not([type="radio"]), 
            select[required],
            textarea[required]
        `).forEach(input => {
            if (!input.value.trim()) {
                markAsInvalid(input);
            } else {
                markAsValid(input);
            }
        });

        // Validar radio groups
        const radioGroups = {};
        currentStepElement.querySelectorAll('input[type="radio"]').forEach(radio => {
            const groupName = radio.name;
            const groupHasRequired = currentStepElement.querySelector(`input[name="${groupName}"][required]`);
            if (groupHasRequired) {
                radioGroups[groupName] = radioGroups[groupName] || 
                    document.querySelector(`input[name="${groupName}"]:checked`);
            }
        });

        for (const groupName in radioGroups) {
            if (!radioGroups[groupName]) {
                markRadioGroupAsInvalid(groupName);
            } else {
                markRadioGroupAsValid(groupName);
            }
        }
    };

    const updateNavigationButtons = () => {
        const nextButtons = document.querySelectorAll('[id^="nextBtn"]');
        nextButtons.forEach(btn => {
            btn.disabled = !validateCurrentStep();
        });
    };

    const updateProgress = () => {
        const progress = document.getElementById('formProgress');
        if (progress) {
            progress.style.width = `${((currentStep + 1) / formSteps.length) * 100}%`;
        }
    };
 // Event listeners modificados
    document.querySelectorAll('[id^="nextBtn"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!validateCurrentStep()) {
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

    // Validación en tiempo real
    document.querySelectorAll('input, select').forEach(field => {
        field.addEventListener('input', updateNavigationButtons);
        if (field.type === 'radio') {
            field.addEventListener('change', updateNavigationButtons);
        }
    });

    // Inicialización
    showStep(currentStep);
    updateNavigationButtons(); // Esta línea es crucial para el estado inicial
    // Nueva validación inicial forzada
    validateOnStepChange();
});