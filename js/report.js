// ==================== Configuration ====================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwRHe-yh5uMlTrxwjdc53RfeJ_8z7RiQnepXrx1ceEH0psGD_nOzvP36gZXVw0PDCbU/exec';

// ==================== Global Variables ====================
let allTransactions = [];
let currentMonth = '';

// ==================== Initialization ====================
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
    loadTransactions();
    populateMonthOptions();
});

// ==================== Theme Management ====================
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    icon.textContent = theme === 'light' ? '☀️' : '🌙';
}

// ==================== Load Transactions ====================
async function loadTransactions() {
    try {
        showLoading();

        const response = await fetch(`${SCRIPT_URL}?action=getTransactions`);
        const data = await response.json();

        if (data.success) {
            allTransactions = data.transactions;
            generateReport(allTransactions);
        } else {
            throw new Error(data.message || 'Failed to load transactions');
        }

    } catch (error) {
        console.error('Error loading transactions:', error);
        showEmpty('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
}

// ==================== Generate Report ====================
function generateReport(transactions) {
    if (!transactions || transactions.length === 0) {
        showEmpty('ยังไม่มีรายการ');
        updateSummary([], 0, 0, 0);
        return;
    }

    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) =>
        new Date(a.date) - new Date(b.date)
    );

    // Group by date
    const groupedByDate = groupTransactionsByDate(sortedTransactions);

    // Generate table rows
    generateTableRows(groupedByDate);

    // Update summary
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const netBalance = totalIncome - totalExpense;

    updateSummary(transactions, totalIncome, totalExpense, netBalance);
}

// ==================== Group Transactions by Date ====================
function groupTransactionsByDate(transactions) {
    const grouped = {};

    transactions.forEach(transaction => {
        const date = transaction.date;
        if (!grouped[date]) {
            grouped[date] = {
                income: [],
                expense: []
            };
        }

        if (transaction.type === 'income') {
            grouped[date].income.push(transaction);
        } else {
            grouped[date].expense.push(transaction);
        }
    });

    return grouped;
}

// ==================== Generate Table Rows ====================
function generateTableRows(groupedByDate) {
    const tbody = document.getElementById('reportTableBody');
    tbody.innerHTML = '';

    let runningBalance = 0;
    const dates = Object.keys(groupedByDate).sort();

    dates.forEach(date => {
        const dayData = groupedByDate[date];
        const incomeItems = dayData.income;
        const expenseItems = dayData.expense;
        const maxRows = Math.max(incomeItems.length, expenseItems.length);

        for (let i = 0; i < maxRows; i++) {
            const row = document.createElement('tr');

            // Date cell (only for first row of the date)
            if (i === 0) {
                const dateCell = document.createElement('td');
                dateCell.className = 'date-cell';
                dateCell.textContent = formatThaiDate(date);
                dateCell.rowSpan = maxRows;
                row.appendChild(dateCell);
            }

            // Income item
            const incomeItem = incomeItems[i];
            if (incomeItem) {
                const incomeDescCell = document.createElement('td');
                incomeDescCell.textContent = incomeItem.description || incomeItem.category;
                row.appendChild(incomeDescCell);

                const incomeAmountCell = document.createElement('td');
                incomeAmountCell.className = 'income-cell';
                incomeAmountCell.textContent = `+${formatCurrency(incomeItem.amount)} บาท`;
                row.appendChild(incomeAmountCell);

                runningBalance += parseFloat(incomeItem.amount);
            } else {
                row.appendChild(document.createElement('td'));
                row.appendChild(document.createElement('td'));
            }

            // Expense item
            const expenseItem = expenseItems[i];
            if (expenseItem) {
                const expenseDescCell = document.createElement('td');
                expenseDescCell.textContent = expenseItem.description || expenseItem.category;
                row.appendChild(expenseDescCell);

                const expenseAmountCell = document.createElement('td');
                expenseAmountCell.className = 'expense-cell';
                expenseAmountCell.textContent = `-${formatCurrency(expenseItem.amount)} บาท`;
                row.appendChild(expenseAmountCell);

                runningBalance -= parseFloat(expenseItem.amount);
            } else {
                row.appendChild(document.createElement('td'));
                row.appendChild(document.createElement('td'));
            }

            // Balance cell (only for last row of the date)
            if (i === maxRows - 1) {
                const balanceCell = document.createElement('td');
                balanceCell.className = `balance-cell ${runningBalance >= 0 ? 'positive' : 'negative'}`;
                balanceCell.textContent = `${formatCurrency(Math.abs(runningBalance))} บาท`;
                balanceCell.rowSpan = 1;
                row.appendChild(balanceCell);
            } else {
                row.appendChild(document.createElement('td'));
            }

            tbody.appendChild(row);
        }
    });
}

// ==================== Update Summary ====================
function updateSummary(transactions, income, expense, net) {
    document.getElementById('reportIncome').textContent = `฿${formatCurrency(income)}`;
    document.getElementById('reportExpense').textContent = `฿${formatCurrency(expense)}`;
    document.getElementById('reportNet').textContent = `฿${formatCurrency(net)}`;

    // Update net card color based on balance
    const netCard = document.getElementById('reportNet').closest('.balance-card');
    if (net < 0) {
        netCard.classList.add('expense');
        netCard.classList.remove('income', 'net');
    } else {
        netCard.classList.add('net');
        netCard.classList.remove('income', 'expense');
    }
}

// ==================== Populate Month Options ====================
function populateMonthOptions() {
    const select = document.getElementById('reportMonth');

    // Generate last 12 months
    const months = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = formatMonthYear(date);
        months.push({ value, label });
    }

    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month.value;
        option.textContent = month.label;
        select.appendChild(option);
    });
}

// ==================== Filter Report ====================
function filterReport() {
    const selectedMonth = document.getElementById('reportMonth').value;
    currentMonth = selectedMonth;

    if (!selectedMonth) {
        generateReport(allTransactions);
        return;
    }

    const filtered = allTransactions.filter(t => {
        const transactionMonth = t.date.substring(0, 7); // YYYY-MM
        return transactionMonth === selectedMonth;
    });

    generateReport(filtered);
}

// ==================== Export Report ====================
function exportReport() {
    const table = document.getElementById('reportTable');
    let csv = [];

    // Get headers
    const headers = [];
    table.querySelectorAll('thead th').forEach(th => {
        headers.push(th.textContent);
    });
    csv.push(headers.join(','));

    // Get rows
    table.querySelectorAll('tbody tr').forEach(tr => {
        const row = [];
        tr.querySelectorAll('td').forEach(td => {
            // Clean up text and wrap in quotes if contains comma
            let text = td.textContent.replace(/"/g, '""');
            if (text.includes(',')) {
                text = `"${text}"`;
            }
            row.push(text);
        });
        csv.push(row.join(','));
    });

    // Create download
    const csvContent = csv.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const filename = currentMonth
        ? `รายงานรายรับรายจ่าย_${currentMonth}.csv`
        : `รายงานรายรับรายจ่าย_ทั้งหมด.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('ส่งออกข้อมูลสำเร็จ', 'success');
}

// ==================== Utility Functions ====================
function formatCurrency(amount) {
    return parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatThaiDate(dateString) {
    const date = new Date(dateString);
    const thaiMonths = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];

    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543; // Convert to Buddhist Era

    return `${day} ${month} ${year}`;
}

function formatMonthYear(date) {
    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543;

    return `${month} ${year}`;
}

function showLoading() {
    const tbody = document.getElementById('reportTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="loading">กำลังโหลดข้อมูล...</td></tr>';
}

function showEmpty(message) {
    const tbody = document.getElementById('reportTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="report-empty">
                <div class="report-empty-icon">📊</div>
                <div class="report-empty-text">${message}</div>
            </td>
        </tr>
    `;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==================== Check Configuration ====================
window.addEventListener('load', function() {
    if (SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
        showToast('⚠️ กรุณาตั้งค่า Google Apps Script URL ในไฟล์ report.js', 'error');
        showEmpty('กรุณาตั้งค่า Google Apps Script URL');
    }
});
