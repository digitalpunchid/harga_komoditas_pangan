const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// --- Configuration ---
const API_URL = 'https://api-panelhargav2.badanpangan.go.id/api/front/harga-pangan-informasi?province_id=12&city_id=179&level_harga_id=3';
const CSV_FILE_PATH = path.join(__dirname, 'harga_komoditas_konsumen_kota_bandung.csv');
const TIMEZONE = 'Asia/Jakarta'; // GMT+7

/**
 * Gets the current timestamp in GMT+7 (WIB)
 * @returns {string} The formatted timestamp (e.g., "2025-09-14")
 */
function getCurrentTimestamp() {
    const now = new Date();
    //toLocaleString can handle timezones correctly
    const options = { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' };
    const datePart = new Date(now.toLocaleString('en-US', options)).toISOString().split('T')[0];
    return datePart;
}


/**
 * Fetches the food price data from the API.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of commodity data.
 */
async function fetchData() {
    try {
        console.log(`Fetching data from ${API_URL}...`);
        const response = await axios.get(API_URL);
        if (response.status === 200 && response.data && response.data.data && response.data.data.length > 0) {
            console.log("Data fetched successfully.");
            return response.data.data;
        }
        throw new Error('No data found in API response.');
    } catch (error) {
        console.error('Error fetching data:', error.message);
        throw error; // Re-throw to fail the script
    }
}

/**
 * Formats the raw data into a CSV string.
 * @param {Array<Object>} data - The array of data from the API.
 * @param {string} timestamp - The current timestamp.
 * @returns {string} A CSV-formatted string.
 */
function formatToCsv(data, timestamp) {
    return data.map(item => {
        // **FIX:** Check if item.harga is not null or undefined, otherwise default to an empty string.
        const price = (item.harga != null) ? item.harga.toString().replace(/,/g, '') : '';
        const commodity = `"${item.komoditas.replace(/"/g, '""')}"`; // Escape double quotes
        return `${timestamp},${commodity},${price}`;
    }).join('\n');
}

/**
 * Main function to run the data update process.
 */
async function main() {
    try {
        const data = await fetchData();
        const timestamp = getCurrentTimestamp();
        console.log(`Using timestamp: ${timestamp}`);

        let csvContent = '';
        let fileExists = false;

        try {
            await fs.access(CSV_FILE_PATH);
            fileExists = true;
            console.log('CSV file exists. Appending data.');
        } catch (error) {
            console.log('CSV file does not exist. Creating with header.');
        }

        if (!fileExists) {
            const header = 'date,commodity,price_idr\n';
            csvContent += header;
        }

        const newCsvRows = formatToCsv(data, timestamp);
        csvContent += newCsvRows + '\n'; // Add a newline at the end

        await fs.appendFile(CSV_FILE_PATH, csvContent, 'utf8');
        console.log(`Successfully appended ${data.length} new rows to ${path.basename(CSV_FILE_PATH)}.`);

    } catch (error) {
        console.error('Script failed:', error.message);
        process.exit(1); // Exit with error code to fail the GitHub Action
    }
}

main();

