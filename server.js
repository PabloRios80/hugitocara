const express = require('express');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
app.use(express.json());

// Servir archivos estáticos desde la raíz del proyecto
app.use(express.static(__dirname));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static('public'));

// =========================================================================
// LÓGICA DEL SERVIDOR DE RECOMENDACIONES (PREVENTIVE_BACKEND.JS) UNIFICADA
// =========================================================================

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const API_KEY = process.env.API_KEY;
async function connectToGoogleSheet() {
    let authConfig = {};

    if (process.env.CREDENTIALS_JSON) {
        authConfig = {
            credentials: JSON.parse(process.env.CREDENTIALS_JSON),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        };
    } else {
        authConfig = {
            keyFile: 'credentials.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        };
    }

    const auth = new google.auth.GoogleAuth(authConfig);
    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });

    try {
        await googleSheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        return { googleSheets, spreadsheetId: SPREADSHEET_ID };
    } catch (error) {
        console.error('Error al conectar con la hoja:', error);
        throw error;
    }
}

app.get('/getPreventivePlan/:dni', async (req, res) => {
    const dni = req.params.dni;
    try {
        const { googleSheets, spreadsheetId } = await connectToGoogleSheet();

        // --- Lectura de Hoja 1 (datos del formulario actual) ---
        const responseHoja1 = await googleSheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Hoja 1',
        });
        const rowsHoja1 = responseHoja1.data.values;

        if (!rowsHoja1 || rowsHoja1.length === 0) {
            return res.status(404).send('No se encontraron datos en la hoja de formularios (Hoja 1).');
        }

        const headersHoja1 = rowsHoja1[0].map(header => header.trim());
        const userDataRow = rowsHoja1.slice(1).find(row => {
            const rowData = Object.fromEntries(headersHoja1.map((header, index) => [header, row[index]]));
            // ⚠️ La corrección clave: usar trim() para eliminar espacios ⚠️
            return rowData['DNI'] && rowData['DNI'].trim() === dni.trim();
        });

        if (!userDataRow) {
            return res.status(404).send('Usuario no encontrado en la hoja de formularios (Hoja 1).');
        }

        const userDataObject = Object.fromEntries(headersHoja1.map((header, index) => [header, userDataRow[index]]));

        // --- Lectura de Hoja 2 (antecedentes de estudios previos) ---
        const responseHoja2 = await googleSheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Hoja 2',
        });
        const rowsHoja2 = responseHoja2.data.values;
        let previousStudiesData = {};

        if (rowsHoja2 && rowsHoja2.length > 0) {
            const headersHoja2 = rowsHoja2[0].map(header => header.trim());
            const userPreviousStudiesRow = rowsHoja2.slice(1).find(row => {
                const rowData = Object.fromEntries(headersHoja2.map((header, index) => [header, row[index]]));
                // ✅ CORRECCIÓN: Verifica si la celda de DNI existe antes de usar trim()
                return rowData['DNI'] && rowData['DNI'].trim() === dni.trim();
            });

            if (userPreviousStudiesRow) {
                const columnsOfInterest = [
                    'Cancer_cervico_uterino_HPV', 'Cancer_cervico_uterino_PAP', 'Fecha_cierre_DP',
                    'Cancer_colon_Colonoscopia', 'Cancer_mama_Mamografia', 'Hepatitis_B',
                    'Hepatitis_C', 'VIH', 'VDRL', 'Prostata_PSA', 'Chagas'
                ];
                headersHoja2.forEach((header, index) => {
                    if (columnsOfInterest.includes(header)) {
                        previousStudiesData[header] = userPreviousStudiesRow[index] ? userPreviousStudiesRow[index].trim() : '';
                    }
                });
            }
        }
        
        const preventivePlan = generatePreventivePlan(userDataObject, previousStudiesData);
        res.json(preventivePlan);

    } catch (error) {
        console.error('Error al obtener el plan preventivo:', error);
        res.status(500).send('Error al generar el plan preventivo');
    }
});

function generatePreventivePlan(userData, previousStudiesData = {}) { 
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
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": null,
                "condicion1_valor": null,
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Cada 1 años si tiene factores de riesgo",
            "explicativo_id": "glucemia_ayunas_riesgo"
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
            "edad_hasta": 100,
            "sexo_biologico": "Ambos",
            "condicion1_campo": null,
            "condicion1_valor": null,
            "condicion2_campo": null,
            "condicion2_valor": null
            },
            "repeticion": "Según riesgo",
            "explicativo_id": "perfil_lipidico_riesgo"
        },
        {
            "categoria": "Prevención de enfermedades crónicas y riesgo cardiovascular",
            "subcategoria": "Rastreo de hipertension",
            "practica": "tomar TA ambos brazos",
            "indicacion": {
            "edad_desde": 18,
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
            "categoria": "Prevención de   enfermedades crónicas y riesgo cardiovascular",
            "subcategoria": "Rastreo enfermedad renal cronica (ERC)",
            "practica": [
            "creatinina",
            "formula filtrado glomerular"
            ],
            "indicacion": {
            "edad_desde": 40,
            "edad_hasta": 100,
            "sexo_biologico": "Ambos",
            "condicion1_campo": null,
            "condicion1_valor": null, // Asegúrate de que los valores sean arrays
            "condicion2_campo": null,
            "condicion2_valor": null 
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
                "edad_desde": 21, "edad_hasta": 65, "sexo_biologico": "femenino",
                "condicion1_campo": null, "condicion1_valor": null,
                "condicion2_campo": null, "condicion2_valor": null
            },
            "repeticion": "Cada 3 años",
            "explicativo_id": "pap_general",
            "antecedente_columna": "Cancer_cervico_uterino_PAP", // Columna en Hoja 2
            "antecedente_resultado_omitir": ["Normal", "Patologico"], // Resultados que significan que ya se hizo
            "mensaje_previo": "Este estudio ya está realizado (fecha: ${Fecha_cierre_DP}).", // Usa ${} para variables
            "mensaje_repetir": null // No hay mensaje para repetir aquí, se recomienda si aplica
        },
        {
            "categoria": "Prevención del cáncer",
            "subcategoria": "Rastreo de cáncer de cuello uterino - VPH",
            "practica": "Test de VPH",
            "indicacion": {
                "edad_desde": 30, "edad_hasta": 65, "sexo_biologico": "femenino",
                "condicion1_campo": null, "condicion1_valor": null,
                "condicion2_campo": null, "condicion2_valor": null
            },
            "repeticion": "Cada 5 años",
            "explicativo_id": "vph_general",
            "antecedente_columna": "Cancer_cervico_uterino_HPV", // Mismo campo que PAP para VPH
            "antecedente_resultado_omitir": ["Normal", "Patologico"],
            "mensaje_previo": "Este estudio de VPH ya está realizado (fecha: ${Fecha_cierre_DP}).",
            "mensaje_repetir": null
        },
        {
            "categoria": "Prevención del cáncer",
            "subcategoria": "Rastreo de cáncer de colon",
            "practica": "Sangre oculta en materia fecal (SOMF)",
            "indicacion": {
                "edad_desde": 40,
                "edad_hasta": 80,
                "sexo_biologico": "Ambos",
                "condicion1_campo": null, // Antecedente familiar
                "condicion1_valor": null,
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
                "edad_desde": 50,
                "edad_hasta": 80,
                "sexo_biologico": "Ambos",
                "condicion1_campo": null, // Sin antecedente familiar (implícito)
                "condicion1_valor": null, // O podrías no tener esta condición
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Cada 5 años (general) / Según criterio médico (riesgo)",
            "explicativo_id": "vcc_riesgo_familiar",
            "antecedente_columna": "Cancer_colon_Colonoscopia",
            "antecedente_resultado_omitir": ["Normal", "Patologico"],
            "mensaje_previo": "Existen estudios previos de Colonoscopia (normal/patológico). Discutir con el profesional tratante la necesidad de repetirla."
        },
        {
            "categoria": "Prevención del cáncer",
            "subcategoria": "Rastreo de cáncer de mama",
            "practica": "ecografia mamaria",
            "indicacion": {
                "edad_desde": 40,
                "edad_hasta": 80,
                "sexo_biologico": "femenino",
                "condicion1_campo": null, // Antecedente familiar
                "condicion1_valor": null,
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
                "edad_desde": 50,
                "edad_hasta": 80,
                "sexo_biologico": "femenino",
                "condicion1_campo": null, // Sin antecedente familiar (implícito por la ausencia de condición)
                "condicion1_valor": null, // O podrías no tener esta condición y se aplicaría si la anterior no se cumple
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Según criterio médico (riesgo)",
            "explicativo_id": "mamografia_general",
            "antecedente_columna": "Cancer_mama_Mamografia",
            "antecedente_resultado_omitir": ["Normal", "Patologico"],
            "mensaje_previo": "Existen estudios previos de Mamografía (normal/patológico). Discutir con el profesional tratante la necesidad de repetirla."
        },
        {
            "categoria": "Prevención del cáncer",
            "subcategoria": "Rastreo de cáncer de próstata - PSA",
            "practica": "Prostata_PSA",
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
            "explicativo_id": "psa_general",
            "antecedente_columna": "Prostata_PSA",
            "antecedente_resultado_omitir": ["Normal", "Patologico"],
            "mensaje_previo": "Existen estudios previos de PSA. Comentar con su médico tratante."
        },
        // ... infecciosas ...
        {
            "categoria": "Prevención de enfermedades infecciosas",
            "subcategoria": "Rastreo de VIH",
            "practica": "VIH",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": null,
                "condicion1_valor": null,
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Según riesgo",
            "explicativo_id": "vih_general",
            "antecedente_columna": "VIH",
            "antecedente_resultado_omitir": ["Negativo", "Positivo"],
            "mensaje_previo": "Existen estudios previos de VIH. Comentar con su médico tratante."
        },
        {
            "categoria": "Prevención de enfermedades infecciosas",
            "subcategoria": "Prevención de Hepatitis B",
            "practica": "Hepatitis B",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": null,
                "condicion1_valor": null,
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Según riesgo",
            "explicativo_id": "hepatitis_b_general",
            "antecedente_columna": "Hepatitis_B",
            "antecedente_resultado_omitir": ["Negativo", "Positivo"],
            "mensaje_previo": "Existen estudios previos de Hepatitis B. Comentar con su médico tratante."
        },
        {
            "categoria": "Prevención de enfermedades infecciosas",
            "subcategoria": "Rastreo de Hepatitis C",
            "practica": "Hepatitis C",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": null,
                "condicion1_valor": null,
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Según riesgo",
            "explicativo_id": "hepatitis_c_general",
            "antecedente_columna": "Hepatitis_C",
            "antecedente_resultado_omitir": ["Negativo", "Positivo"],
            "mensaje_previo": "Existen estudios previos de Hepatitis C. Comentar con su médico tratante."
        },
        {
            "categoria": "Prevención de enfermedades infecciosas",
            "subcategoria": "Rastreo de Sífilis",
            "practica": "VDRL",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": null,
                "condicion1_valor": null,
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Según riesgo",
            "explicativo_id": "vdrl_general",
            "antecedente_columna": "VDRL",
            "antecedente_resultado_omitir": ["Negativo", "Positivo"],
            "mensaje_previo": "Existen estudios previos de VDRL. Comentar con su médico tratante."
        },
        {
            "categoria": "Prevención de enfermedades infecciosas",
            "subcategoria": "Rastreo de Chagas",
            "practica": "Chagas",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 100,
                "sexo_biologico": "Ambos",
                "condicion1_campo": null,
                "condicion1_valor": null,
                "condicion2_campo": null,
                "condicion2_valor": null
            },
            "repeticion": "Según riesgo",
            "explicativo_id": "chagas_general",
            "antecedente_columna": "Chagas",
            "antecedente_resultado_omitir": ["Negativo", "Positivo"],
            "mensaje_previo": "Existen estudios previos de Chagas. Comentar con su médico tratante."
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

// Lógica para aplicar las recomendaciones
tablaRecomendaciones.forEach(rec => {
    const { indicacion, practica, antecedente_columna, antecedente_resultado_omitir, mensaje_previo, repeticion, explicativo_id } = rec;
    let shouldRecommend = true;
    let finalExplicativo = "Información no disponible."; // Inicializa con un valor por defecto

    // --- LOGS DE DEPURACIÓN CLAVE ---
    console.log(`\n--- Evaluando práctica: ${practica} ---`);
    console.log(`  antecedente_columna de la regla: ${antecedente_columna}`);
    console.log(`  Valores a omitir según la regla (antecedente_resultado_omitir):`, antecedente_resultado_omitir);

    if (antecedente_columna && previousStudiesData[antecedente_columna] !== undefined && previousStudiesData[antecedente_columna] !== null) {
        const antecedenteValueRaw = previousStudiesData[antecedente_columna].trim();

        // Normalizar el valor leído de la Hoja 2: a minúsculas y sin tildes
        const antecedenteValueNormalized = antecedenteValueRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        console.log(`  Valor LEIDO de Hoja 2 para ${antecedente_columna}: '${antecedenteValueRaw}'`);
        console.log(`  Valor NORMALIZADO de Hoja 2: '${antecedenteValueNormalized}'`); // Nuevo log para depuración

        if (antecedente_resultado_omitir) {
            // Normalizar también los valores de la lista de omisión en tu tablaRecomendaciones
            const omitirNormalized = antecedente_resultado_omitir.map(val => val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

            // --- LA LÍNEA CLAVE PARA ENTENDER SI LA CONDICIÓN SE CUMPLE ---
            const condicionDeOmisionSeCumple = omitirNormalized.includes(antecedenteValueNormalized);
            console.log(`  ¿'${antecedenteValueNormalized}' está en [${omitirNormalized.join(', ')}]? -> ${condicionDeOmisionSeCumple}`); // Log actualizado

            if (condicionDeOmisionSeCumple) {
                shouldRecommend = false;
                console.log(`  ¡OMITIENDO recomendación para ${practica} debido a antecedentes! shouldRecommend = false`);
                if (mensaje_previo) {
                    finalExplicativo = mensaje_previo.replace(/\$\{(\w+)\}/g, (match, p1) => {
                        return previousStudiesData[p1] || '';
                    });
                } else {
                    finalExplicativo = "Ya existen estudios previos de esta práctica. Consultar con su médico tratante.";
                }
            }
        }
    }
    else if (antecedente_columna) { // Solo si antecedente_columna está definido, pero no se encontró el valor
        console.log(`  No se encontró valor en previousStudiesData para '${antecedente_columna}' o es undefined/null.`);
    }

    // --- LOG: Estado final de shouldRecommend antes de la decisión de agregar ---
    console.log(`  Estado final de shouldRecommend para ${practica}: ${shouldRecommend}`);

    // Paso 2: Si la recomendación no fue omitida por antecedentes previos, aplicar la lógica normal
    if (shouldRecommend) {
        if (age >= indicacion.edad_desde && age <= indicacion.edad_hasta) {
            const indicadoSexo = (indicacion.sexo_biologico || '').toLowerCase();

            if (indicadoSexo === "ambos" || indicadoSexo === sex) {
                let cumpleCondiciones = true;

                if (indicacion.condicion1_campo && indicacion.condicion1_valor) {
                    const userValue = userData[indicacion.condicion1_campo];
                    if (!userValue || !indicacion.condicion1_valor.includes(userValue)) {
                        cumpleCondiciones = false;
                    }
                }

                if (indicacion.condicion2_campo && indicacion.condicion2_valor) {
                    const userValue = userData[indicacion.condicion2_campo];
                    if (!userValue || !indicacion.condicion2_valor.includes(userValue)) {
                        cumpleCondiciones = false;
                    }
                }

                if (cumpleCondiciones) {
                    const explicativoObj = explicativos[explicativo_id] || { titulo: "Información no disponible.", mensaje: "Información detallada no disponible." };
                    
                    // --- INICIO DE MODIFICACIÓN ---
                    // QUITA la siguiente línea si la tenías antes:
                    // recommendations.push({ ... });
                    
                    const newRecommendation = { // Declara newRecommendation aquí
                        categoria: rec.categoria,
                        subcategoria: rec.subcategoria,
                        practica: practica,
                        repeticion: repeticion,
                        explicativo: explicativoObj // Siempre un objeto
                    };
                    console.log(`  --> AGREGANDO ${practica} (por criterios de formulario)`);
                    console.log(`  Objeto de recomendación a agregar:`, newRecommendation); // <-- ESTE LOG AHORA FUNCIONARÁ
                    recommendations.push(newRecommendation); // Solo un push aquí
                    // --- FIN DE MODIFICACIÓN ---
                }
            }
        }
    } 
    else { // Si shouldRecommend es false (se omite por antecedentes)
        const newRecommendation = { // Declara newRecommendation aquí
            categoria: rec.categoria,
            subcategoria: rec.subcategoria,
            practica: practica,
            repeticion: repeticion, // Podrías poner "N/A" o similar si quieres
            // Si la recomendación se omite, el explicativo es un OBJETO con el mensaje de antecedente
            explicativo: {
                titulo: `Estudio ya realizado`, // O un título genérico que quieras
                mensaje: finalExplicativo,     // El mensaje personalizado
                de_que_se_trata: "Este estudio fue identificado como realizado o no aplicable según sus antecedentes.",
                para_quien_se_recomienda: "",
                cuando_repetir: "",
                riesgos: "",
                que_hacer: "Por favor, consulte con su médico tratante para revisar sus antecedentes y la necesidad de futuras prácticas."
            }
        };
        console.log(`  --> AGREGANDO ${practica} (con mensaje de antecedente)`);
        console.log(`  Objeto de recomendación a agregar:`, newRecommendation); // <-- ESTE LOG AHORA FUNCIONARÁ
        recommendations.push(newRecommendation); // Solo un push aquí
    }
}); // <-- EL FOR EACH TERMINA AQUÍ.
    return {
        name: userData['Nombre'] + ' ' + userData['Apellido'],
        age: age,
        sex: sex,
        bmiCategory: bmiCategory,
        recommendations: recommendations
    };
} // <-- Y LA FUNCIÓN generatePreventivePlan TERMINA AQUÍ.

// =========================================================================
// LÓGICA DEL SERVIDOR PRINCIPAL (SERVER.JS ORIGINAL) UNIFICADA
// =========================================================================
async function saveDataToSheet(data) {
    let authConfig = {};

    if (process.env.CREDENTIALS_JSON) {
        authConfig = {
            credentials: JSON.parse(process.env.CREDENTIALS_JSON),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        };
    } else {
        authConfig = {
            keyFile: 'credentials.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        };
    }

    const auth = new google.auth.GoogleAuth(authConfig);
    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });

    // ✅ Paso 1: Limpiar el DNI antes de crear el array de valores
    const dniLimpio = data.DNI.replace(/^'/, ''); 

    // ✅ Paso 2: Crear un array con los valores del formulario en el orden exacto de las columnas
    const valoresDeFila = [
        dniLimpio,
        data.Fecha_de_Nacimiento,
        data.Apellido,
        data.Nombre,
        data.Edad,
        data.Email,
        data.Telefono,
        data.Sexo_biologico,
        data.Genero_autopercibido,
        data.Altura,
        data.Peso,
        data.BMI,
        data.Categoria_BMI,
        data.Hipertension,
        data.Diabetes,
        data.Colesterol,
        data.Depresion,
        data.Actividad_fisica,
        data.sedentarismo,
        data.Abuso_alcohol_y_o_drogas,
        data.Stress,
        data.Exceso_preocupacion_salud,
        data.Exceso_pantalla,
        data.Fuma,
        data.Fumador_cronico,
        data.Hipertension_familiar,
        data.Diabetes_familiar,
        data.Adicciones_familiar,
        data.Obesidad_familiar,
        data.Depresion_familiar,
        data.Violencia_familiar,
        data.Cancer_de_colon,
        data.Cancer_de_mama,
        data.Cancer_cuello_utero,
        data.Cancer_de_prostata,
    ];

    const resource = {
        values: [valoresDeFila],
    };

    try {
        await googleSheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Hoja 1',
            valueInputOption: 'USER_ENTERED',
            resource,
        });
        console.log('Datos guardados correctamente.');
    } catch (error) {
        console.error('Error al guardar datos:', error);
        throw error;
    }
}

app.post('/saveData', async (req, res) => {
    try {
        await saveDataToSheet(req.body);
        res.send('Datos guardados correctamente.');
    } catch (error) {
        res.status(500).send('Error al guardar datos.');
    }
});

app.post('/checkDNI', async (req, res) => {
    const dniToCheck = req.body.dni;
    let authConfig = {};

    if (process.env.CREDENTIALS_JSON) {
        authConfig = {
            credentials: JSON.parse(process.env.CREDENTIALS_JSON),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        };
    } else {
        authConfig = {
            keyFile: 'credentials.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        };
    }

    try {
        const auth = new google.auth.GoogleAuth(authConfig);
        const client = await auth.getClient();
        const googleSheets = google.sheets({ version: 'v4', auth: client });

        const response = await googleSheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Hoja 1!A:D',
        });
        const rows = response.data.values;

        if (rows && rows.length > 0) {
            for (const row of rows) {
                // ⚠️ La corrección clave: usar trim() para eliminar espacios ⚠️
                if (row[0].trim() === dniToCheck.trim()) {
                    return res.json({
                        exists: true,
                        nombre: row[3] || '',
                        apellido: row[2] || '',
                        fechaDeNacimiento: row[1] || '',
                    });
                }
            }
        }
        return res.json({ exists: false });

    } catch (error) {
        console.error('Error al verificar el DNI:', error);
        return res.status(500).json({ error: 'Error al acceder a la base de datos' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});