
const express = require('express');
const { google } = require('googleapis');
require('dotenv').config();
const cors = require('cors');
const app_preventive = express();
app_preventive.use(express.json());
app_preventive.use(cors());

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const API_KEY = process.env.API_KEY;

async function connectToGoogleSheet() {
    const auth = new google.auth.GoogleAuth({
        keyFile: 'credentials.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });

    try {
        const docInfo = await googleSheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
            key: API_KEY, // Puedes usar la API Key para lectura si está configurada
        });
        const sheetName = 'Hoja 1'; // Asegúrate de que este sea el nombre correcto de tu hoja
        const sheet = googleSheets.spreadsheets.values;
        return { googleSheets, spreadsheetId: SPREADSHEET_ID, sheetName };
    } catch (error) {
        console.error('Error al conectar con la hoja:', error);
        throw error;
    }
}

// ... (aquí irá la lógica para leer los datos y generar el plan preventivo) ...

const PREVENTIVE_PORT = 3001; // Elige un puerto diferente para este backend
app_preventive.listen(PREVENTIVE_PORT, () => {
    console.log(`Servidor preventivo corriendo en http://localhost:${PREVENTIVE_PORT}`);
});
// ... (dentro de preventive_backend.js) ...

app_preventive.get('/getPreventivePlan/:dni', async (req, res) => {
    const dni = req.params.dni;
    try {
        const { googleSheets, spreadsheetId, sheetName } = await connectToGoogleSheet();
        const response = await googleSheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: sheetName,
        });
        const rows = response.data.values;

        if (rows && rows.length > 0) {
            const headers = rows[0].map(header => header.trim());
            const userData = rows.slice(1).find(row => {
                const rowData = Object.fromEntries(headers.map((header, index) => [header, row[index]]));
                return rowData['DNI'] === dni; // Ajusta el nombre de la columna 'DNI'
            });

            if (userData) {
                const userDataObject = Object.fromEntries(headers.map((header, index) => [header, userData[index]]));
                const preventivePlan = generatePreventivePlan(userDataObject);
                res.json(preventivePlan);
            } else {
                res.status(404).send('Usuario no encontrado');
            }
        } else {
            res.status(404).send('No se encontraron datos en la hoja');
        }

    } catch (error) {
        console.error('Error al obtener el plan preventivo:', error);
        res.status(500).send('Error al generar el plan preventivo');
    }
});

function generatePreventivePlan(userData) {
    const age = parseInt(userData['Edad']);
    const sex = userData['Sexo biologico'];
    const bmiCategory = userData['BMICategoria'];
    const hypertension = userData['Hipertension'];
    const diabetes = userData['Diabetes'];
    const colesterol = userData['Colesterol'];
    const fuma = userData['Fuma'];
    const hipertensionFamiliar = userData['Hipertension familiar'];
    const diabetesFamiliar = userData['Diabetes familiar'];
    const obesidadFamiliar = userData['Obesidad familiar'];
    const cancerColonFamiliar = userData['Cancer de colon'];
    const cancerMamaFamiliar = userData['Cancer de mama'];
    const cancerCuelloUteroFamiliar = userData['Cancer cuello utero'];
    const cancerProstataFamiliar = userData['Cancer de prostata'];

    const recommendations = [];
    const explicativos = require('./explicativos.json'); // Asumiendo que guardaremos los textos en un archivo explicativos.json

    const tablaRecomendaciones = [
        {
            "categoria": "Prevención de enfermedades crónicas y riesgo cardiovascular",
            "subcategoria": "Rastreo de Diabetes",
            "practica": "Glucemia en ayunas",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 40,
                "sexo_biologico": "Ambos",
                "condicion1_campo": "Categoria BMI",
                "condicion1_valor": ["Obesidad", "Sobrepeso"],
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Cada 1 años si tiene factores de riesgo",
            "explicativo_id": "glucemia_ayunas_riesgo"
        },
        {
            "categoria": "Prevención de enfermedades crónicas y riesgo cardiovascular",
            "subcategoria": "Rastreo de Diabetes",
            "practica": "Glucemia en ayunas",
            "indicacion": {
                "edad_desde": 40,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": "Categoria BMI",
                "condicion1_valor": ["Normal", "Bajo peso"],
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Cada 2 años",
            "explicativo_id": "glucemia_ayunas_mayor40"
        },
        {
            "categoria": "Prevención de enfermedades crónicas y riesgo cardiovascular",
            "subcategoria": "Rastreo de dislipemias",
            "practica": [
            "Colesterol total",
            "Colesterol HDL",
            "Colesterol LDL"
            ],
            "indicacion": {
            "edad_desde": 18,
            "edad_hasta": 40,
            "sexo_biologico": "Ambos",
            "condicion1_campo": "Categoria BMI",
            "condicion1_valor": ["Obesidad", "Sobrepeso"],
            "condicion2_campo": null,
            "condicion2_valor": null
            },
            "repeticion": "Según riesgo",
            "explicativo_id": "perfil_lipidico_riesgo"
        },
        {
            "categoria": "Prevención de enfermedades crónicas y riesgo cardiovascular",
            "subcategoria": "Rastreo de dislipemias",
            "practica": [
                "Colesterol total",
                "Colesterol HDL",
                "Colesterol LDL"
            ],
            "indicacion": {
                "edad_desde": 40,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": "Categoria BMI",
                "condicion1_valor": ["Normal", "Bajo peso"],
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Cada 2 años",
            "explicativo_id": "colesterol_mayor40"
        },
        {
            "categoria": "Prevención de enfermedades crónicas y riesgo cardiovascular",
            "subcategoria": "Rastreo de hipertension",
            "practica": "tomar TA ambos brazos",
            "indicacion": {
            "edad_desde": 40,
            "edad_hasta": 100,
            "sexo_biologico": "Ambos",
            "condicion1_campo": null,
            "condicion1_valor": null,
            "condicion2_campo": null,
            "condicion2_valor": null
            },
            "repeticion": "Cada 1 años",
            "explicativo_id": "rastreo_de_hipertension_mayor40"
        },
        {
            "categoria": "Prevención de enfermedades crónicas y riesgo cardiovascular",
            "subcategoria": "Rastreo enfermedad renal cronica (ERC)",
            "practica": [
            "creatinina",
            "formula filtrado glomerular"
            ],
            "indicacion": {
            "edad_desde": 40,
            "edad_hasta": 100,
            "sexo_biologico": "Ambos",
            "condicion1_campo": "Hipertension",
            "condicion1_valor": ["si"], // Asegúrate de que los valores sean arrays
            "condicion2_campo": "Diabetes",
            "condicion2_valor": ["si"] 
            },
            "repeticion": "Cada 1 años",
            "explicativo_id": "rastreo_de_erc_riesgo"
        },
        // ... prevencion del cancer ...
        {
            "categoria": "Prevención del cáncer",
            "subcategoria": "Rastreo de cáncer de cuello uterino - PAP",
            "practica": "Papanicolaou (PAP)",
            "indicacion": {
                "edad_desde": 21,
                "edad_hasta": 65,
                "sexo_biologico": "femenino",
                "condicion1_campo": null,
                "condicion1_valor": null,
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Cada 3 años",
            "explicativo_id": "pap_general"
        },
        {
            "categoria": "Prevención del cáncer",
            "subcategoria": "Rastreo de cáncer de cuello uterino - VPH",
            "practica": "Test de VPH",
            "indicacion": {
                "edad_desde": 30,
                "edad_hasta": 65,
                "sexo_biologico": "femenino",
                "condicion1_campo": null,
                "condicion1_valor": null,
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Cada 5 años",
            "explicativo_id": "vph_general"
        },
        {
            "categoria": "Prevención del cáncer",
            "subcategoria": "Rastreo de cáncer de colon",
            "practica": "Sangre oculta en materia fecal (SOMF)",
            "indicacion": {
                "edad_desde": 40,
                "edad_hasta": 80,
                "sexo_biologico": "Ambos",
                "condicion1_campo": "Cancer de colon", // Antecedente familiar
                "condicion1_valor": ["si"],
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Anual (SOMF) / Según criterio médico (VCC)",
            "explicativo_id": "rastreo_colon_riesgo" // Puedes crear un nuevo ID
        },
        {
            "categoria": "Prevención del cáncer",
            "subcategoria": "Rastreo de cáncer de colon",
            "practica": "Videocolonoscopia (VCC)",
            "indicacion": {
                "edad_desde": 40,
                "edad_hasta": 80,
                "sexo_biologico": "Ambos",
                "condicion1_campo": "Cancer de colon", // Antecedente familiar
                "condicion1_valor": ["si"],
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Cada 5 años (general) / Según criterio médico (riesgo)",
            "explicativo_id": "vcc_riesgo_familiar"
        },
        {
            "categoria": "Prevención del cáncer",
            "subcategoria": "Rastreo de cáncer de colon",
            "practica": "Sangre oculta en materia fecal (SOMF)",
            "indicacion": {
                "edad_desde": 50,
                "edad_hasta": 80,
                "sexo_biologico": "Ambos",
                "condicion1_campo": "Cancer de colon", // Sin antecedente familiar (implícito)
                "condicion1_valor": ["no"], // O podrías no tener esta condición
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Anual (SOMF)",
            "explicativo_id": "rastreo_colon_general" // Puedes crear un nuevo ID
        },
            {
            "categoria": "Prevención del cáncer",
            "subcategoria": "Rastreo de cáncer de mama",
            "practica": "ecografia mamaria",
            "indicacion": {
                "edad_desde": 40,
                "edad_hasta": 80,
                "sexo_biologico": "femenino",
                "condicion1_campo": "Cancer de mama", // Antecedente familiar
                "condicion1_valor": ["si"],
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Según criterio médico (riesgo)",
            "explicativo_id": "ecografia_riesgo_familiar"
            },
            {
            "categoria": "Prevención del cáncer",
            "subcategoria": "Rastreo de cáncer de mama",
            "practica": "mamografia",
            "indicacion": {
                "edad_desde": 40,
                "edad_hasta": 80,
                "sexo_biologico": "femenino",
                "condicion1_campo": "Cancer de mama", // Antecedente familiar
                "condicion1_valor": ["si"],
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Según criterio médico (riesgo)",
            "explicativo_id": "mamografia_riesgo_familiar" // Puedes crear un nuevo ID si es necesario
            },
            {
            "categoria": "Prevención del cáncer",
            "subcategoria": "Rastreo de cáncer de mama",
            "practica": "mamografia",
            "indicacion": {
                "edad_desde": 50,
                "edad_hasta": 80,
                "sexo_biologico": "femenino",
                "condicion1_campo": "Cancer de mama", // Sin antecedente familiar (implícito por la ausencia de condición)
                "condicion1_valor": ["no"], // O podrías no tener esta condición y se aplicaría si la anterior no se cumple
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Cada 2 años",
            "explicativo_id": "mamografia_general"
            },
            {
            "categoria": "Prevención de cáncer de próstata",
            "subcategoria": "Rastreo con PSA",
            "practica": ["Antígeno Prostático Específico - PSA"],
            "indicacion": {
                "edad_desde": 50,
                "edad_hasta": 80,
                "sexo_biologico": "masculino",
                "condicion1_campo": null,
                "condicion1_valor": null,
                "condicion2_campo": "Cancer de prostata",
                "condicion2_valor": ["si"],
                "edad_desde_condicion2": 40,
                "edad_hasta_condicion2": 80
            },
            "repeticion": "Según criterio médico",
            "explicativo_id": "psa_general"
        },
        // ... infecciosas ...
        {
            "categoria": "Prevención de enfermedades infecciosas",
            "subcategoria": "Prevención de VIH",
            "practica": "Test diagnóstico VIH",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": null,
                "condicion1_valor": null,
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Cada 2 años",
            "explicativo_id": "test_diagnostico_vih"
        },
        {
            "categoria": "Prevención de enfermedades infecciosas",
            "subcategoria": "Prevención de Hepatitis B",
            "practica": "Test diagnóstico VHB (HBsAg, Ac anti-HBc, Ac anti-HBs)",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": null,
                "condicion1_valor": null,
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "2 test diagnósticos en la vida",
            "explicativo_id": "test_diagnostico_vhb"
        },
        {
            "categoria": "Prevención de enfermedades infecciosas",
            "subcategoria": "Prevención de Hepatitis C",
            "practica": "Test diagnóstico VHC (Ac anti-VHC)",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": null,
                "condicion1_valor": null,
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "2 test diagnósticos en la vida",
            "explicativo_id": "test_diagnostico_vhc"
        },
        {
            "categoria": "Prevención de enfermedades infecciosas",
            "subcategoria": "Prevención de Sífilis",
            "practica": "Test diagnóstico para Sífilis (VDRL, FTA-Abs)",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": null,
                "condicion1_valor": null,
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Cada 2 años",
            "explicativo_id": "test_diagnostico_sifilis"
        },
        {
            "categoria": "Prevención de enfermedades infecciosas",
            "subcategoria": "Prevención de Chagas",
            "practica": "Test diagnóstico para Chagas",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": null,
                "condicion1_valor": null,
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "2 test diagnósticos en la vida",
            "explicativo_id": "test_diagnostico_chagas"
        },
        //   salud bucal   
        {
            "categoria": "Salud bucal",
            "subcategoria": "Prevencion en salud bucal",
            "practica": "Control odontológico",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": null,
                "condicion1_valor": null,
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Cada 1 año",
            "explicativo_id": "control_odontologico_adulto" // Asegúrate de tener este ID en explicativos.json
        },
        // agudeza visual 
        {
            "categoria": "Control de agudeza visual",
            "subcategoria": "Prevención salud visual",
            "practica": "Control de agudeza visual",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": null,
                "condicion1_valor": null,
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Cada 1 año",
            "explicativo_id": "control_agudeza_visual_mayores18" // Asegúrate de tener este ID
        },
        // tabaquismo
        {
            "categoria": "Estilos de vida / hábitos",
            "subcategoria": "Tabaquismo",
            "practica": "Consejería / asesoramiento en cesación tabáquica",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": "Fuma",
                "condicion1_valor": ["menos_de_10", "entre_10_y_20", "mas_de_20"],
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Información y seguimiento según necesidad",
            "explicativo_id": "consejo_cesacion_tabaquica"
        },
        {
            "categoria": "Estilos de vida / hábitos",
            "subcategoria": "Tabaquismo",
            "practica": "Espirometria",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": "Fuma",
                "condicion1_valor": ["menos_de_10", "entre_10_y_20", "mas_de_20", "ex-fumador"],
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Información y seguimiento según necesidad",
            "explicativo_id": "EPOC_Espirometria"
        },
        // actividad fisica 
        {
            "categoria": "Estilos de vida / hábitos",
            "subcategoria": "actividad fisica",
            "practica": "Consejería en actividad física",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": "Actividad fisica",
                "condicion1_valor": ["no"],
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Información y seguimiento según necesidad",
            "explicativo_id": "consejo_actividad_fisica"
        },
        {
            "categoria": "Estilos de vida / hábitos",
            "subcategoria": "actividad fisica",
            "practica": "Consejería en actividad física",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": "sedentarismo",
                "condicion1_valor": ["si"],
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Información y seguimiento según necesidad",
            "explicativo_id": "consejo_actividad_fisica" // Puedes usar el mismo ID si el consejo es el mismo
        },
        // alimentacion saludable
        {
            "categoria": "Estilos de vida / hábitos",
            "subcategoria": "alimentacion saludable",
            "practica": "Consejería en alimentación saludable",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": "Categoria BMI",
                "condicion1_valor": ["Sobrepeso", "Obesidad"],
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Información y seguimiento según necesidad",
            "explicativo_id": "consejo_alimentacion_saludable" // Asegúrate de tener este ID
        },
        // abuso alcohol y drogas
        {
            "categoria": "Estilos de vida / hábitos",
            "subcategoria": "abuso alcohol y drogas",
            "practica": "Consejería en reducción de consumo de alcohol y/o drogas",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": "Abuso alcohol y/o drogas",
                "condicion1_valor": ["si"],
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Información y seguimiento según necesidad",
            "explicativo_id": "consejo_reduccion_alcohol" // Asegúrate de tener este ID
        },
        //prevencion aneurisma aorta abdominal
        {
            "categoria": "Estilos de vida / hábitos",
            "subcategoria": "Prevención de aneurisma de aorta abdominal",
            "practica": "Ecografía de aorta abdominal",
            "indicacion": {
                "edad_desde": 60,
                "edad_hasta": 80,
                "sexo_biologico": "masculino",
                "condicion1_campo": "Fumador cronico",
                "condicion1_valor": ["si"],
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Según criterio médico (única vez como screening)",
            "explicativo_id": "prevencion_aneurisma_aorta_abdominal"
        }

    ];

    const addedRecommendations = new Set(); // Utilizamos un Set para rastrear las recomendaciones añadidas

    tablaRecomendaciones.forEach(recomendacion => {
        const cumpleEdad = age >= recomendacion.indicacion.edad_desde && age <= recomendacion.indicacion.edad_hasta;
        const cumpleSexo = recomendacion.indicacion.sexo_biologico === 'Ambos' || recomendacion.indicacion.sexo_biologico.toLowerCase() === sex.toLowerCase();
        let cumpleCondicion1 = true;
        let cumpleCondicion2 = true;

        if (recomendacion.indicacion.condicion1_campo && userData[recomendacion.indicacion.condicion1_campo]) {
            cumpleCondicion1 = recomendacion.indicacion.condicion1_valor.includes(userData[recomendacion.indicacion.condicion1_campo]);
        }

        if (recomendacion.indicacion.condicion2_campo && userData[recomendacion.indicacion.condicion2_campo]) {
            cumpleCondicion2 = recomendacion.indicacion.condicion2_valor.includes(userData[recomendacion.indicacion.condicion2_campo]);
        }

        if (cumpleEdad && cumpleSexo && cumpleCondicion1 && cumpleCondicion2) {
            const practica = Array.isArray(recomendacion.practica) ? recomendacion.practica : [recomendacion.practica];
            practica.forEach(p => {
                const recommendationKey = `${p}-${recomendacion.explicativo_id}`; // Creamos una clave única para la recomendación
                if (!addedRecommendations.has(recommendationKey)) {
                    recommendations.push({
                        practica: p,
                        explicativo_id: recomendacion.explicativo_id
                    });
                    addedRecommendations.add(recommendationKey); // Marcamos esta recomendación como añadida
                }
            });
        }
    });

    return {
        name: userData['Nombre'] + ' ' + userData['Apellido'],
        age: age,
        sex: sex,
        bmiCategory: bmiCategory,
        recommendations: recommendations
    };
}