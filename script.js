async function saveFormData() {
    const dni = document.getElementById('dni').value;
    const birthDate = document.getElementById('birthDate').value;
    // const age = document.getElementById('age').value;
    // const fullName = document.getElementById('fullName').value;
    // const biologicalSex = document.querySelector('input[name="biologicalSex"]:checked').value;
    // const genderIdentity = document.getElementById('genderIdentity').value;
    // const height = document.getElementById('height').value;
    // const weight = document.getElementById('weight').value;
    // const bmiValue = document.getElementById('bmiValue').textContent;
    // const hypertension = document.querySelector('input[name="hypertension"]:checked').value;
    // const diabetes = document.querySelector('input[name="diabetes"]:checked').value;
    // const cholesterol = document.querySelector('input[name="cholesterol"]:checked').value;
    // const depression = document.querySelector('input[name="depression"]:checked').value;
    // const colonCancer = document.querySelector('input[name="colonCancer"]:checked').value;
    // const breastCancer = document.querySelector('input[name="breastCancer"]:checked').value;
    // const cervicalCancer = document.querySelector('input[name="cervicalCancer"]:checked').value;
    // const prostateCancer = document.querySelector('input[name="prostateCancer"]:checked').value;
    // const email = document.getElementById('email').value;
    // const phone = document.getElementById('phone').value;
    // const reminders = document.querySelector('input[name="reminders"]:checked').value;
    // const smoking = document.querySelector('input[name="smoking"]:checked').value;
    // const alcoholConsumption = document.getElementById('alcoholConsumption').value;
    // const physicalActivity = document.getElementById('physicalActivity').value;
    // const drugUse = document.querySelector('input[name="drugUse"]:checked').value;
    // const diet = document.getElementById('diet').value;
    // const otherConditions = document.getElementById('otherConditions').value;

    const formData = {
        dni, birthDate,
        // age, fullName, biologicalSex, genderIdentity, height, weight, bmiValue,
        // hypertension, diabetes, cholesterol, depression, colonCancer, breastCancer, cervicalCancer,
        // prostateCancer, email, phone, reminders, smoking, alcoholConsumption, physicalActivity,
        // drugUse, diet, otherConditions,
    };
    try {
        const response = await fetch('/saveData', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            alert('Datos guardados correctamente.');
        } else {
            alert('Error al guardar datos. Inténtalo de nuevo.');
        }
    } catch (error) {
        console.error('Error al guardar datos:', error);
        alert('Error al guardar datos. Inténtalo de nuevo.');
    }
}
// Función para calcular el IMC
function calculateBMI() {
    const height = parseFloat(document.getElementById('height').value) / 100; // Convertir a metros
    const weight = parseFloat(document.getElementById('weight').value);

    if (height && weight) {
        const bmi = weight / (height * height);
        document.getElementById('bmiValue').textContent = bmi.toFixed(2);

        let category = '';
        if (bmi < 18.5) {
            category = 'Bajo peso';
            document.getElementById('bmiCategory').className = 'ml-2 text-sm px-2 py-1 rounded-full bg-yellow-200 text-yellow-800';
        } else if (bmi < 25) {
            category = 'Peso normal';
            document.getElementById('bmiCategory').className = 'ml-2 text-sm px-2 py-1 rounded-full bg-green-200 text-green-800';
        } else if (bmi < 30) {
            category = 'Sobrepeso';
            document.getElementById('bmiCategory').className = 'ml-2 text-sm px-2 py-1 rounded-full bg-orange-200 text-orange-800';
        } else {
            category = 'Obesidad';
            document.getElementById('bmiCategory').className = 'ml-2 text-sm px-2 py-1 rounded-full bg-red-200 text-red-800';
        }
        document.getElementById('bmiCategory').textContent = category;
    } else {
        document.getElementById('bmiValue').textContent = '--';
        document.getElementById('bmiCategory').textContent = '';
    }
}
function calculateAge() {
    const birthDate = document.getElementById('birthDate').value;
    const parts = birthDate.split('/');

    if (parts.length !== 3) {
        document.getElementById('age').value = ''; // Fecha inválida
        return;
    }

    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // Meses en JavaScript son 0-11
    const year = parseInt(parts[2]);

    const today = new Date();
    const birthDateObj = new Date(year, month, day);

    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
        age--;
    }

    document.getElementById('age').value = age;
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('birthDate').addEventListener('change', calculateAge);

    function startQuestionnaire() {
        console.log('Función startQuestionnaire ejecutada');
        document.getElementById('welcomeScreen').classList.add('hidden');
        document.getElementById('mainForm').classList.remove('hidden');
        document.getElementById('formProgress').style.width = '20%';
    }

    document.getElementById('height').addEventListener('input', calculateBMI);
    document.getElementById('weight').addEventListener('input', calculateBMI);
    document.getElementById('startQuestionnaireButton').addEventListener('click', startQuestionnaire);

    // Configurar el evento click para el botón "Guardar y Continuar"
    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        saveButton.addEventListener('click', function() {
            saveFormData(); // Llama a la función para guardar los datos.

            // Ocultar todos los pasos del formulario
            const formSteps = document.querySelectorAll('.form-step');
            formSteps.forEach(step => step.classList.add('hidden'));

            // Ocultar el botón "Anterior" (si aún existe en el HTML)
            const prevBtn = document.getElementById('prevBtn');
            if (prevBtn) {
                prevBtn.classList.add('hidden');
            }

           // Mostrar la sección de resultados
            const resultsSection = document.getElementById('resultsSection');
            if (resultsSection) {
                resultsSection.classList.remove('hidden');

               // **OCULTAR el botón "Guardar y Continuar" cuando se muestra la sección de resultados**
            saveButton.classList.add('hidden');
            } else {
            console.error('No se encontró el elemento resultsSection.');
            }


            // Llenar los datos del usuario en la sección de resultados
            document.getElementById('resultName').textContent = document.getElementById('fullName').value;
            document.getElementById('resultDNI').textContent = document.getElementById('dni').value;
            document.getElementById('resultAge').textContent = document.getElementById('age').value;
            const biologicalSexElement = document.querySelector('input[name="biologicalSex"]:checked');
            document.getElementById('resultSex').textContent = biologicalSexElement ? biologicalSexElement.value : '';
            document.getElementById('resultHeight').textContent = document.getElementById('height').value;
            document.getElementById('resultWeight').textContent = document.getElementById('weight').value;
            document.getElementById('resultBMI').textContent = document.getElementById('bmiValue').textContent;
            document.getElementById('resultBMICategory').textContent = document.getElementById('bmiCategory').textContent;

            // Actualizar la barra de progreso al 100%
            document.getElementById('formProgress').style.width = '100%';
        });
    }
});