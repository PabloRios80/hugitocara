
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
        // Es más seguro usar 'https://www.googleapis.com/auth/spreadsheets.readonly'
        // si solo necesitas leer datos, pero 'https://www.googleapis.com/auth/spreadsheets'
        // está bien si también vas a escribir en otras partes del código.
        scopes: ['https://www.googleapis.com/auth/spreadsheets'], 
    });

    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });

    try {
        // La llamada a .get() para verificar la conexión está bien aquí.
        // No necesitas la API_KEY si usas credenciales de servicio.
        await googleSheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });
        
        // ¡Esta es la línea clave! Solo devuelve lo que está definido y necesitas.
        return { googleSheets, spreadsheetId: SPREADSHEET_ID };
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
        const { googleSheets, spreadsheetId } = await connectToGoogleSheet();

        // --- Lectura de Hoja 1 (datos del formulario actual) ---
        const responseHoja1 = await googleSheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Hoja 1', // O el nombre real de tu hoja de formularios
        });
        const rowsHoja1 = responseHoja1.data.values;

        if (!rowsHoja1 || rowsHoja1.length === 0) {
            return res.status(404).send('No se encontraron datos en la hoja de formularios (Hoja 1).');
        }

        const headersHoja1 = rowsHoja1[0].map(header => header.trim());
        const userDataRow = rowsHoja1.slice(1).find(row => {
            const rowData = Object.fromEntries(headersHoja1.map((header, index) => [header, row[index]]));
            return rowData['DNI'] === dni;
        });

        if (!userDataRow) {
            return res.status(404).send('Usuario no encontrado en la hoja de formularios (Hoja 1).');
        }

        const userDataObject = Object.fromEntries(headersHoja1.map((header, index) => [header, userDataRow[index]]));

        // --- Lectura de Hoja 2 (antecedentes de estudios previos) ---
        const responseHoja2 = await googleSheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Hoja 2', // ¡Este es el nombre de tu hoja de antecedentes!
        });
        const rowsHoja2 = responseHoja2.data.values; // <-- ¡Corregido!
        let previousStudiesData = {}; // Objeto para almacenar los datos relevantes de estudios previos
        if (rowsHoja2 && rowsHoja2.length > 0) {
            const headersHoja2 = rowsHoja2[0].map(header => header.trim());
            const userPreviousStudiesRow = rowsHoja2.slice(1).find(row => {
                const rowData = Object.fromEntries(headersHoja2.map((header, index) => [header, row[index]]));
                return rowData['DNI'] === dni;
            });

            if (userPreviousStudiesRow) {
                const columnsOfInterest = [
                    'Cancer_cervico_uterino_HPV',
                    'Cancer_cervico_uterino_PAP',
                    'Fecha_cierre_DP', 
                    'Cancer_colon_Colonoscopia',
                    'Cancer_mama_Mamografia',
                    'Hepatitis_B',
                    'Hepatitis_C', 
                    'VIH',
                    'VDRL',
                    'Prostata_PSA',
                    'Chagas'
                ];

                headersHoja2.forEach((header, index) => {
                    if (columnsOfInterest.includes(header)) {
                        // Asegúrate de usar el valor de la fila, no el headersHoja2[index]
                        previousStudiesData[header] = userPreviousStudiesRow[index] ? userPreviousStudiesRow[index].trim() : '';
                    }
                });
            }
        }
        console.log("Datos de estudios previos del usuario:", previousStudiesData); // Para depuración

        // --- Generar el plan preventivo con ambos conjuntos de datos ---
        const preventivePlan = generatePreventivePlan(userDataObject, previousStudiesData); // Aquí se pasa como argumento
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
                "edad_desde": 50,
                "edad_hasta": 80,
                "sexo_biologico": "Ambos",
                "condicion1_campo": "Cancer de colon", // Sin antecedente familiar (implícito)
                "condicion1_valor": ["no"], // O podrías no tener esta condición
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