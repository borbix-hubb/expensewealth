// ==================== Configuration ====================
// ตั้งค่า Google Spreadsheet URL
// คัดลอก URL จาก Google Sheets ของคุณมาใส่ตรงนี้

const GOOGLE_SHEET_URL = 'YOUR_GOOGLE_SHEET_URL_HERE';

// ตัวอย่าง:
// const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1ABC123xyz.../edit';

// ==================== Function ====================
function openGoogleSheet() {
    if (GOOGLE_SHEET_URL === 'YOUR_GOOGLE_SHEET_URL_HERE') {
        alert('⚠️ กรุณาตั้งค่า Google Sheet URL ในไฟล์ js/config.js');
        return;
    }
    window.open(GOOGLE_SHEET_URL, '_blank');
}
