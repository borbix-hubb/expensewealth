// ==================== Google Apps Script for Expense Tracker ====================
// ไฟล์นี้ต้องอัปโหลดไปยัง Google Apps Script และ Deploy เป็น Web App

// ==================== Configuration ====================
// ตั้งค่า Spreadsheet ID หรือใช้ Spreadsheet ที่เปิดอยู่
const SPREADSHEET_ID = ''; // ถ้าว่างจะใช้ Spreadsheet ที่เปิดอยู่
const SHEET_NAME = 'Transactions';

// ==================== Get or Create Sheet ====================
function getSheet() {
  let spreadsheet;

  if (SPREADSHEET_ID) {
    spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  } else {
    spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  }

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    initializeSheet(sheet);
  }

  return sheet;
}

// ==================== Initialize Sheet with Headers ====================
function initializeSheet(sheet) {
  const headers = [
    'ID',
    'วันที่',
    'ประเภท',
    'หมวดหมู่',
    'รายละเอียด',
    'จำนวนเงิน',
    'เวลาบันทึก'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Format header row
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#6366f1')
    .setFontColor('#ffffff');

  // Set column widths
  sheet.setColumnWidth(1, 80);  // ID
  sheet.setColumnWidth(2, 120); // วันที่
  sheet.setColumnWidth(3, 100); // ประเภท
  sheet.setColumnWidth(4, 150); // หมวดหมู่
  sheet.setColumnWidth(5, 250); // รายละเอียด
  sheet.setColumnWidth(6, 120); // จำนวนเงิน
  sheet.setColumnWidth(7, 180); // เวลาบันทึก

  // Freeze header row
  sheet.setFrozenRows(1);
}

// ==================== Handle GET Requests ====================
function doGet(e) {
  try {
    const action = e.parameter.action;

    switch (action) {
      case 'getTransactions':
        return getTransactions();

      case 'getBalance':
        return getBalance();

      default:
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            message: 'Invalid action'
          }))
          .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==================== Handle POST Requests ====================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    switch (action) {
      case 'addTransaction':
        return addTransaction(data.data);

      case 'deleteTransaction':
        return deleteTransaction(data.id);

      case 'updateTransaction':
        return updateTransaction(data.id, data.data);

      default:
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            message: 'Invalid action'
          }))
          .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==================== Add Transaction ====================
function addTransaction(data) {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    const newId = lastRow > 0 ? lastRow : 1;

    const row = [
      newId,
      data.date,
      data.type === 'income' ? 'รายรับ' : 'รายจ่าย',
      data.category,
      data.description,
      parseFloat(data.amount),
      new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
    ];

    sheet.appendRow(row);

    // Format the new row
    const newRowIndex = sheet.getLastRow();
    const range = sheet.getRange(newRowIndex, 1, 1, 7);

    // Alternate row colors
    if (newRowIndex % 2 === 0) {
      range.setBackground('#f9fafb');
    }

    // Format amount column
    sheet.getRange(newRowIndex, 6).setNumberFormat('#,##0.00');

    // Apply conditional formatting for type
    if (data.type === 'income') {
      sheet.getRange(newRowIndex, 3).setBackground('#d1fae5').setFontColor('#10b981');
    } else {
      sheet.getRange(newRowIndex, 3).setBackground('#fee2e2').setFontColor('#ef4444');
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'บันทึกข้อมูลสำเร็จ',
        id: newId
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'เกิดข้อผิดพลาด: ' + error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==================== Get All Transactions ====================
function getTransactions() {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          transactions: []
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();

    const transactions = data.map(row => {
      return {
        id: row[0],
        date: Utilities.formatDate(new Date(row[1]), 'Asia/Bangkok', 'yyyy-MM-dd'),
        type: row[2] === 'รายรับ' ? 'income' : 'expense',
        category: row[3],
        description: row[4],
        amount: row[5],
        timestamp: row[6]
      };
    });

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        transactions: transactions
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'เกิดข้อผิดพลาด: ' + error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==================== Get Balance Summary ====================
function getBalance() {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          balance: {
            income: 0,
            expense: 0,
            net: 0
          }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();

    let totalIncome = 0;
    let totalExpense = 0;

    data.forEach(row => {
      const type = row[2];
      const amount = parseFloat(row[5]);

      if (type === 'รายรับ') {
        totalIncome += amount;
      } else {
        totalExpense += amount;
      }
    });

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        balance: {
          income: totalIncome,
          expense: totalExpense,
          net: totalIncome - totalExpense
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'เกิดข้อผิดพลาด: ' + error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==================== Delete Transaction ====================
function deleteTransaction(id) {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'ไม่พบรายการที่ต้องการลบ'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

    for (let i = 0; i < data.length; i++) {
      if (data[i][0] == id) {
        sheet.deleteRow(i + 2); // +2 because of header and 0-based index

        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            message: 'ลบรายการสำเร็จ'
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'ไม่พบรายการที่ต้องการลบ'
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'เกิดข้อผิดพลาด: ' + error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==================== Update Transaction ====================
function updateTransaction(id, data) {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'ไม่พบรายการที่ต้องการแก้ไข'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const idData = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

    for (let i = 0; i < idData.length; i++) {
      if (idData[i][0] == id) {
        const rowIndex = i + 2;

        sheet.getRange(rowIndex, 2).setValue(data.date);
        sheet.getRange(rowIndex, 3).setValue(data.type === 'income' ? 'รายรับ' : 'รายจ่าย');
        sheet.getRange(rowIndex, 4).setValue(data.category);
        sheet.getRange(rowIndex, 5).setValue(data.description);
        sheet.getRange(rowIndex, 6).setValue(parseFloat(data.amount));
        sheet.getRange(rowIndex, 7).setValue(new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }));

        // Update conditional formatting
        if (data.type === 'income') {
          sheet.getRange(rowIndex, 3).setBackground('#d1fae5').setFontColor('#10b981');
        } else {
          sheet.getRange(rowIndex, 3).setBackground('#fee2e2').setFontColor('#ef4444');
        }

        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            message: 'แก้ไขรายการสำเร็จ'
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'ไม่พบรายการที่ต้องการแก้ไข'
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'เกิดข้อผิดพลาด: ' + error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==================== Test Functions ====================
// ฟังก์ชันสำหรับทดสอบการทำงาน
function testAddTransaction() {
  const testData = {
    date: '2025-01-15',
    type: 'expense',
    category: 'อาหาร/เครื่องดื่ม',
    description: 'ทดสอบเพิ่มรายการ',
    amount: 150.50,
    timestamp: new Date().toISOString()
  };

  const result = addTransaction(testData);
  Logger.log(result.getContent());
}

function testGetTransactions() {
  const result = getTransactions();
  Logger.log(result.getContent());
}
