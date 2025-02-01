const authForm = document.getElementById('authForm');
const signUpBtn = document.getElementById('signUpBtn');
const errorMessage = document.getElementById('errorMessage');

let isLogin = true;

signUpBtn.addEventListener('click', () => {
    isLogin = !isLogin;
    signUpBtn.textContent = isLogin ? 'Sign Up Instead' : 'Login Instead';
    authForm.querySelector('h2').textContent = isLogin ? 'Login' : 'Sign Up';
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`/api/${isLogin ? 'login' : 'register'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error);

        // Store token and user data in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/dashboard.html';
    } catch (error) {
        errorMessage.textContent = error.message;
    }
});