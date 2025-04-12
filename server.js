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
    const auth = new google.auth.GoogleAuth({
        keyFile: 'credentials.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

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