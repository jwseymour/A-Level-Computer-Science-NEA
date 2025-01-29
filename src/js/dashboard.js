const userDetails = document.getElementById('userDetails');
const signOutBtn = document.getElementById('signOutBtn');

// Check if user is logged in
const user = JSON.parse(localStorage.getItem('user'));
if (!user) {
    window.location.href = '/auth.html';
}

// Display user details
userDetails.innerHTML = `
    <p>Email: ${user.email}</p>
    <p>User ID: ${user.id}</p>
`;

// Sign Out
signOutBtn.addEventListener('click', () => {
    localStorage.removeItem('user');
    window.location.href = '/auth.html';
});