// ==================== Configuration ====================
// ⚠️ สำคัญ: อย่าลืมแทนที่ URL นี้ด้วย Web App URL ที่ได้จาก Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwRHe-yh5uMlTrxwjdc53RfeJ_8z7RiQnepXrx1ceEH0psGD_nOzvP36gZXVw0PDCbU/exec';

// ==================== Categories ====================
const CATEGORIES = {
    expense: [
        'อาหาร/เครื่องดื่ม',
        'ค่าเดินทาง',
        'ค่าที่พัก',
        'ช้อปปิ้ง',
        'บันเทิง',
        'สุขภาพ',
        'การศึกษา',
        'ค่าน้ำค่าไฟ',
        'ค่าโทรศัพท์/อินเทอร์เน็ต',
        'อื่นๆ'
    ],
    income: [
        'เงินเดือน',
        'โบนัส',
        'ขายของ',
        'ดอกเบี้ย',
        'เงินลงทุน',
        'อื่นๆ'
    ]
};

// ==================== Global Variables ====================
let currentType = 'expense';
let allTransactions = [];

// ==================== Initialization ====================
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
    initializeForm();
    setupEventListeners();
    loadTransactions();
    setDefaultDate();
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
    if (icon) {
        icon.textContent = theme === 'light' ? '☀️' : '🌙';
    }
}

// ==================== Form Initialization ====================
function initializeForm() {
    // Set default categories
    updateCategoryOptions(currentType);
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

// ==================== Event Listeners ====================
function setupEventListeners() {
    // Type selector buttons
    const typeButtons = document.querySelectorAll('.type-btn');
    typeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            typeButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentType = this.dataset.type;
            document.getElementById('type').value = currentType;
            updateCategoryOptions(currentType);
        });
    });

    // Form submission
    document.getElementById('transactionForm').addEventListener('submit', handleFormSubmit);

    // Form reset
    document.getElementById('transactionForm').addEventListener('reset', function() {
        setTimeout(() => {
            setDefaultDate();
            updateCategoryOptions(currentType);
        }, 0);
    });
}

// ==================== Category Management ====================
function updateCategoryOptions(type) {
    const categorySelect = document.getElementById('category');
    categorySelect.innerHTML = '<option value="">เลือกหมวดหมู่</option>';

    CATEGORIES[type].forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

// ==================== Form Submission ====================
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        type: document.getElementById('type').value,
        amount: parseFloat(document.getElementById('amount').value),
        date: document.getElementById('date').value,
        category: document.getElementById('category').value,
        description: document.getElementById('description').value || '-',
        timestamp: new Date().toISOString()
    };

    try {
        showLoading('กำลังบันทึกข้อมูล...');

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'addTransaction',
                data: formData
            })
        });

        // Note: no-cors mode doesn't allow reading response
        // We'll assume success if no error is thrown

        showToast('บันทึกข้อมูลสำเร็จ', 'success');
        document.getElementById('transactionForm').reset();
        setDefaultDate();

        // Reload transactions after a short delay
        setTimeout(() => {
            loadTransactions();
        }, 1000);

    } catch (error) {
        console.error('Error:', error);
        showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
}

// ==================== Load Transactions ====================
async function loadTransactions() {
    try {
        showLoading('กำลังโหลดข้อมูล...');

        const response = await fetch(`${SCRIPT_URL}?action=getTransactions`);
        const data = await response.json();

        if (data.success) {
            allTransactions = data.transactions;
            displayTransactions(allTransactions);
            updateBalanceSummary(allTransactions);
        } else {
            throw new Error(data.message || 'Failed to load transactions');
        }

    } catch (error) {
        console.error('Error loading transactions:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('noData').style.display = 'block';
        document.getElementById('noData').textContent = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
}

// ==================== Display Transactions ====================
function displayTransactions(transactions) {
    const container = document.getElementById('transactionContainer');
    const loading = document.getElementById('loading');
    const noData = document.getElementById('noData');

    loading.style.display = 'none';

    if (!transactions || transactions.length === 0) {
        container.innerHTML = '';
        noData.style.display = 'block';
        return;
    }

    noData.style.display = 'none';

    // Sort by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) =>
        new Date(b.date) - new Date(a.date)
    );

    container.innerHTML = sortedTransactions.map((transaction, index) => {
        const icon = transaction.type === 'income' ? '📥' : '📤';
        const sign = transaction.type === 'income' ? '+' : '-';
        const formattedDate = formatDate(transaction.date);
        const formattedAmount = formatCurrency(transaction.amount);

        return `
            <div class="transaction-item ${transaction.type}" data-index="${index}">
                <div class="transaction-icon">${icon}</div>
                <div class="transaction-details">
                    <div class="transaction-category">${transaction.category}</div>
                    <div class="transaction-description">${transaction.description}</div>
                </div>
                <div class="transaction-date">${formattedDate}</div>
                <div class="transaction-amount">${sign}฿${formattedAmount}</div>
                <button class="transaction-delete" onclick="deleteTransaction(${transaction.id || index})" title="ลบรายการ">
                    🗑️
                </button>
            </div>
        `;
    }).join('');
}

// ==================== Update Balance Summary ====================
function updateBalanceSummary(transactions) {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const net = income - expense;

    document.getElementById('totalIncome').textContent = `฿${formatCurrency(income)}`;
    document.getElementById('totalExpense').textContent = `฿${formatCurrency(expense)}`;
    document.getElementById('netBalance').textContent = `฿${formatCurrency(net)}`;
}

// ==================== Filter Transactions ====================
function filterTransactions() {
    const filterMonth = document.getElementById('filterMonth').value;
    const filterType = document.getElementById('filterType').value;

    let filtered = [...allTransactions];

    // Filter by month
    if (filterMonth) {
        filtered = filtered.filter(t => {
            const transactionMonth = t.date.substring(0, 7); // YYYY-MM
            return transactionMonth === filterMonth;
        });
    }

    // Filter by type
    if (filterType !== 'all') {
        filtered = filtered.filter(t => t.type === filterType);
    }

    displayTransactions(filtered);
    updateBalanceSummary(filtered);
}

function resetFilters() {
    document.getElementById('filterMonth').value = '';
    document.getElementById('filterType').value = 'all';
    displayTransactions(allTransactions);
    updateBalanceSummary(allTransactions);
}

// ==================== Delete Transaction ====================
async function deleteTransaction(id) {
    if (!confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
        return;
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'deleteTransaction',
                id: id
            })
        });

        showToast('ลบรายการสำเร็จ', 'success');

        // Reload transactions
        setTimeout(() => {
            loadTransactions();
        }, 1000);

    } catch (error) {
        console.error('Error:', error);
        showToast('เกิดข้อผิดพลาดในการลบรายการ', 'error');
    }
}

// ==================== Utility Functions ====================
function formatCurrency(amount) {
    return parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(dateString) {
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

function showLoading(message) {
    const loading = document.getElementById('loading');
    loading.textContent = message;
    loading.style.display = 'block';
    document.getElementById('noData').style.display = 'none';
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
        showToast('⚠️ กรุณาตั้งค่า Google Apps Script URL ในไฟล์ app.js', 'error');
        document.getElementById('loading').textContent = 'กรุณาตั้งค่า Google Apps Script URL';
    }
});
