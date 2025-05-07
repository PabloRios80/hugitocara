// server.js
const express = require('express');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
app.use(express.json());

// Servir archivos estáticos desde la raíz del proyecto (primero)
app.use(express.static(__dirname));

// Servir archivos estáticos desde la carpeta 'public' (después)
app.use(express.static('public'));

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const API_KEY = process.env.API_KEY;

async function saveDataToSheet(data) {
    let authConfig = {};

    if (process.env.CREDENTIALS_JSON) {
        // Estamos en Render, leer desde la variable de entorno
        authConfig = {
            credentials: JSON.parse(process.env.CREDENTIALS_JSON),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        };
    } else {
        // Estamos localmente, leer desde el archivo
        authConfig = {
            keyFile: 'credentials.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        };
    }

    const auth = new google.auth.GoogleAuth(authConfig);
    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });

    const resource = {
        values: [Object.values(data)],
    };
    console.log("SPREADSHEET_ID:", SPREADSHEET_ID);
    console.log("Nombre de la hoja:", 'hoja de vida IAPOS');

    try {
        await googleSheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Hoja 1', // Cambia a este nombre
            valueInputOption: 'RAW',
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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
// =========================================================================
// NUEVA RUTA PARA VERIFICAR EL DNI
// =========================================================================
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
            range: 'Hoja 1!A:D', // Ajusta el rango según tus columnas (DNI, Nombre, Apellido, Fecha Nacimiento)
        });
        const rows = response.data.values;

        if (rows && rows.length > 0) {
            for (const row of rows) {
                if (row[0] === dniToCheck) { // Asumiendo que el DNI está en la primera columna (índice 0)
                    return res.json({
                        exists: true,
                        nombre: row[3] || '', // Nombre en la segunda columna (índice 1)
                        apellido: row[2] || '', // Apellido en la tercera columna (índice 2)
                        fechaDeNacimiento: row[1] || '', // Fecha de Nacimiento en la cuarta columna (índice 3)
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

