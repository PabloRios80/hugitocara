// preventive_backend.js
const express = require('express');
const { google } = require('googleapis');
require('dotenv').config();
const cors = require('cors');
const app_preventive = express(); // Crea una nueva instancia de express para este backend
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
            // Asumiendo que la primera fila son los encabezados
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

// =========================================================================
// Lógica preventiva (NUEVO)
// =========================================================================
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
                "condicion1_campo": "BMICategoria",
                "condicion1_valor": ["Obesidad", "Sobrepeso"]
            },
            "repeticion": "Cada 1-2 años si tiene factores de riesgo",
            "explicativo_id": "glucemia_ayunas_riesgo"
        },
        {
            "categoria": "Prevención de enfermedades crónicas y riesgo cardiovascular",
            "subcategoria": "Rastreo de Diabetes",
            "practica": "Glucemia en ayunas",
            "indicacion": {
                "edad_desde": 40,
                "edad_hasta": 100,
                "condicion1_campo": null,
                "condicion1_valor": null
            },
            "repeticion": "Cada 3 años",
            "explicativo_id": "glucemia_ayunas_mayor40"
        },
        {
            "categoria": "Prevención de enfermedades crónicas y riesgo cardiovascular",
            "subcategoria": "Rastreo de dislipemias",
            "practica": "Colesterol total",
            "indicacion": {
                "edad_desde": 18,
                "edad_hasta": 40,
                "condicion1_campo": "BMICategoria",
                "condicion1_valor": ["Obesidad", "Sobrepeso"]
            },
            "repeticion": "Según riesgo",
            "explicativo_id": "colesterol_riesgo"
        },
        {
            "categoria": "Prevención de enfermedades crónicas y riesgo cardiovascular",
            "subcategoria": "Rastreo de dislipemias",
            "practica": "Colesterol total",
            "indicacion": {
                "edad_desde": 40,
                "edad_hasta": 100,
                "condicion1_campo": null,
                "condicion1_valor": null
            },
            "repeticion": "Cada 5 años",
            "explicativo_id": "colesterol_mayor40"
        },
        // ... (Aquí irían todas las demás recomendaciones de tu tabla) ...
        {
            "categoria": "Prevención del cáncer",
            "subcategoria": "Rastreo de cáncer de colon",
            "practica": "Colonoscopia",
            "indicacion": {
                "edad_desde": 50,
                "edad_hasta": 75,
                "condicion1_campo": "Cancer de colon",
                "condicion1_valor": "si"
            },
            "repeticion": "Según riesgo",
            "explicativo_id": "colonoscopia_riesgo"
        },
        // ... (Más recomendaciones de cáncer y otras categorías) ...
    ];

    tablaRecomendaciones.forEach(recomendacion => {
        const cumpleEdad = age >= recomendacion.indicacion.edad_desde && age <= recomendacion.indicacion.edad_hasta;
        const cumpleSexo = !recomendacion.indicacion.sexo || recomendacion.indicacion.sexo === 'Ambos' || recomendacion.indicacion.sexo.toLowerCase() === sex.toLowerCase();
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
                recommendations.push({
                    practica: p,
                    explicativo_id: recomendacion.explicativo_id
                });
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
// ... (la parte de iniciar el servidor preventivo) ...