// API Base URL
const API_BASE_URL = 'http://localhost:3000/api';

// Current user data
let currentUser = null;

// Load user data from API
async function loadUserData() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.email) return;
        
        const response = await fetch(`${API_BASE_URL}/user/${user.email}`);
        if (!response.ok) throw new Error('Failed to load user data');
        
        const userData = await response.json();
        currentUser = userData;
        localStorage.setItem('userData', JSON.stringify(userData));
        
        // Update UI
        updateUserUI(userData);
    } catch (error) {
        console.error('Error loading user data:', error);
        showAlert('error', 'Failed to load user data');
    }
}

// Update UI with user data
function updateUserUI(userData) {
    document.getElementById('walletBalance').textContent = userData.walletBalance || 0;
    document.getElementById('totalEarnings').textContent = userData.totalEarnings || 0;
    document.getElementById('totalClicks').textContent = userData.totalClicks || 0;
}

// Handle banner click
async function clickBanner(bannerElement) {
    if (!currentUser) {
        showAlert('error', 'Please login first');
        return;
    }
    
    if (bannerElement.classList.contains('clicked')) {
        showAlert('info', 'This banner has already been clicked today');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/click-banner`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: currentUser.email
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to process click');
        }
        
        // Update banner appearance
        bannerElement.classList.add('clicked');
        bannerElement.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 5px; color: #10b981;"></i>
                <div>₹1 Earned! Come back tomorrow</div>
            </div>
        `;
        
        // Update user data
        currentUser = data;
        updateUserUI(data);
        localStorage.setItem('userData', JSON.stringify(data));
        
        showAlert('success', '₹1 has been added to your wallet!');
        
    } catch (error) {
        showAlert('error', error.message);
    }
}

// Handle withdrawal request
async function requestWithdrawal(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showAlert('error', 'Please login first');
        return;
    }
    
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const method = document.getElementById('withdrawMethod').value;
    
    if (amount < 100) {
        showAlert('error', 'Minimum withdrawal amount is ₹100');
        return;
    }
    
    if (amount > currentUser.walletBalance) {
        showAlert('error', 'Insufficient balance');
        return;
    }
    
    let withdrawalData = {
        email: currentUser.email,
        amount: amount,
        method: method
    };
    
    if (method === 'upi') {
        const upiId = document.getElementById('upiId').value;
        if (!upiId) {
            showAlert('error', 'Please enter your UPI ID');
            return;
        }
        withdrawalData.upiId = upiId;
    } else if (method === 'bank') {
        const accountNumber = document.getElementById('accountNumber').value;
        const ifscCode = document.getElementById('ifscCode').value;
        const accountHolder = document.getElementById('accountHolder').value;
        const bankName = document.getElementById('bankName').value;
        
        if (!accountNumber || !ifscCode || !accountHolder || !bankName) {
            showAlert('error', 'Please fill all bank details');
            return;
        }
        
        withdrawalData = {
            ...withdrawalData,
            accountNumber,
            ifscCode,
            accountHolder,
            bankName
        };
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(withdrawalData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Withdrawal request failed');
        }
        
        // Update user data
        currentUser = data.user;
        updateUserUI(data.user);
        localStorage.setItem('userData', JSON.stringify(data.user));
        
        // Reset form
        event.target.reset();
        document.getElementById('upiField').style.display = 'none';
        document.getElementById('bankFields').style.display = 'none';
        
        showAlert('success', `Withdrawal request of ₹${amount} submitted successfully! It will be processed within 24-48 hours.`);
        
        // Load updated transaction history
        loadTransactionHistory();
        
    } catch (error) {
        showAlert('error', error.message);
    }
}

// Load transaction history
async function loadTransactionHistory() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/transactions/${currentUser.email}`);
        if (!response.ok) throw new Error('Failed to load transactions');
        
        const transactions = await response.json();
        
        const transactionList = document.getElementById('transactionList');
        transactionList.innerHTML = '';
        
        if (transactions.length === 0) {
            transactionList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <i class="fas fa-history" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i>
                    <p>No transactions yet</p>
                </div>
            `;
            return;
        }
        
        transactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const transactionItem = document.createElement('div');
            transactionItem.className = 'transaction-item';
            
            transactionItem.innerHTML = `
                <div class="transaction-type">
                    <i class="fas ${transaction.type === 'banner_click' ? 'fa-mouse-pointer' : 'fa-rupee-sign'} 
                       ${transaction.amount > 0 ? 'positive' : 'negative'}"></i>
                    <div>
                        <div style="font-weight: 600;">${transaction.description}</div>
                        <div style="font-size: 0.9rem; color: #6b7280;">
                            ${date.toLocaleDateString()} ${date.toLocaleTimeString()}
                        </div>
                    </div>
                </div>
                <div class="transaction-amount ${transaction.amount > 0 ? 'positive' : 'negative'}">
                    ${transaction.amount > 0 ? '+' : ''}₹${Math.abs(transaction.amount)}
                </div>
            `;
            
            transactionList.appendChild(transactionItem);
        });
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        showAlert('error', 'Failed to load transaction history');
    }
}

// Refresh banners
function refreshBanners() {
    const banners = document.querySelectorAll('.banner');
    banners.forEach(banner => {
        banner.classList.remove('clicked');
        banner.style.pointerEvents = 'auto';
    });
    showAlert('info', 'Banners refreshed! You can click them again.');
}

// Show alert message
function showAlert(type, message) {
    const alertDiv = document.getElementById(`${type}Alert`);
    const messageSpan = document.getElementById(`${type}Message`);
    
    messageSpan.textContent = message;
    alertDiv.style.display = 'block';
    
    // Hide alert after 5 seconds
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

// Event listeners for login and signup
document.addEventListener('DOMContentLoaded', function() {
    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            try {
                const response = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Login failed');
                }
                
                // Store user data
                localStorage.setItem('user', JSON.stringify(data));
                currentUser = data;
                
                // Show main app
                showMainApp();
                updateUserUI(data);
                
                showAlert('success', `Welcome back, ${data.name}!`);
                
            } catch (error) {
                showAlert('error', error.message);
            }
        });
    }
    
    // Signup form submission
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const phone = document.getElementById('signupPhone').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupConfirmPassword').value;
            
            if (password !== confirmPassword) {
                showAlert('error', 'Passwords do not match');
                return;
            }
            
            try {
                const response = await fetch(`${API_BASE_URL}/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, phone, password })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Registration failed');
                }
                
                // Store user data
                localStorage.setItem('user', JSON.stringify(data));
                currentUser = data;
                
                // Show main app
                showMainApp();
                updateUserUI(data);
                
                showAlert('success', `Welcome to BannerEarn, ${data.name}! You have received ₹10 bonus!`);
                
            } catch (error) {
                showAlert('error', error.message);
            }
        });
    }
    
    // Withdrawal form submission
    const withdrawalForm = document.getElementById('withdrawalForm');
    if (withdrawalForm) {
        withdrawalForm.addEventListener('submit', requestWithdrawal);
    }
});