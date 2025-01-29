async function loadNavbar() {
    try {
        const response = await fetch('/components/navbar.html');
        const html = await response.text();
        
        // Insert the navbar at the start of the body
        document.body.insertAdjacentHTML('afterbegin', html);
        
        // Update navbar based on authentication status
        const user = JSON.parse(localStorage.getItem('user'));
        const authLink = document.querySelector('.nav-auth');
        const dashboardLink = document.querySelector('.nav-dashboard');
        
        if (user) {
            authLink.textContent = 'Logout';
            authLink.href = '#';
            authLink.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('user');
                window.location.href = '/auth.html';
            });
            dashboardLink.style.display = 'inline';
        } else {
            authLink.textContent = 'Login';
            authLink.href = '/auth.html';
            dashboardLink.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading navbar:', error);
    }
}