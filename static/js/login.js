const SignUpButton = document.getElementById("SignUp");
const SignInButton = document.getElementById("SignIn");
const container = document.getElementById("container");
const MIN_LENGTH = 8;
const MAX_LENGTH = 16;

SignUpButton.addEventListener('click', () => {
    container.classList.add("right-panel-active"); // Show Sign Up form
});

SignInButton.addEventListener('click', () => {
    container.classList.remove("right-panel-active"); // Show Sign In form
});


document.addEventListener('DOMContentLoaded', () => {

    
    // Sign-Up Elements
    const signUpButton = document.getElementById('signUpButton');

    // Sign-In Elements
    const signInButton = document.getElementById('signInButton');

    // Event listener for the sign-up button
    signUpButton.addEventListener('click', () => {
        handleSignUp();
        console.log('yes call')
    });

    // Event listener for the sign-in button
    signInButton.addEventListener('click', () => {
        handleSignIn();
    });


       document.getElementsByClassName('far')[0].addEventListener('click', function() {
        const icon = this;
        const passwordInput = document.getElementById('password');
        // Check if the icon has the "open-eye" class
        if (icon.classList.contains('fa-eye-slash')) {
            passwordInput.type='text';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        } else {
            passwordInput.type='password'
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        }
    });

    document.getElementById('password').addEventListener('input',checkPasswordLength)

   

    function setupConfirmPasswordListener() {
        const passwordField = document.getElementById('password');
        const confirmPasswordField = document.getElementById('Confirm_password');
        const errorMessage = document.getElementById('confirm-password-error');
    
        let timeoutId; // Variable to store the timeout ID
    
        confirmPasswordField.addEventListener('input', () => {
            // Clear the previous timeout if the user is still typing
            clearTimeout(timeoutId);
    
            // Set a new timeout
            timeoutId = setTimeout(() => {
                // Check if the confirm password field is empty
            if (confirmPasswordField.value === "") {
                errorMessage.textContent = ""; // Clear error message
                errorMessage.style.display = "none"; // Hide error message
                errorMessage.innerHTML=''
            } else if (confirmPasswordField.value !== passwordField.value) {
                errorMessage.innerHTML='password do not match'
                errorMessage.style.display = "block"; // Show error message
                errorMessage.style.fontSize="16px";
                errorMessage.style.color='red';
            } else if(confirmPasswordField.value === passwordField.value){
                errorMessage.style.color='green';
                errorMessage.style.fontSize="20px";
                errorMessage.textContent = ""; // Clear error message
                errorMessage.style.display = "block"; // Hide error message
                errorMessage.innerHTML='&#10004;'
            }
            }, 1000); // Delay in milliseconds (e.g., 1000 ms = 1 second)
        });
    }

    setupConfirmPasswordListener()

    // Function to handle the sign-up request
    async function handleSignUp() {
        // Get form values
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const cnf_password = document.getElementById('Confirm_password').value;
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
      

        if (!name || !email || !password || !cnf_password) {
            alert('Please fill in all fields.'); // Alert if any field is empty
            return; // Prevent form submission
        }
    
        if (password !== cnf_password) {
            alert('Passwords do not match.'); // Alert if passwords don't match
            return; // Prevent form submission
        }

        const signUpData = new URLSearchParams();
        signUpData.append('name', name);
        signUpData.append('email', email);
        signUpData.append('password', password);
    
        try {
            const response = await fetch('/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': csrfToken
                },
                body: signUpData.toString()  // URL-encoded string format
            });
            console.log(signUpData.toString());  
            console.log(csrfToken); 
            const result = await response.json();
    
            if (response.ok) {
                if(result.message.includes("success")){
                 showModal(result.message, true)
                }else{
                    showModal(result.message,false)
                }
            } else {
                showModal(result.message, false)
            }
    
        } catch (error) {
            console.error('Error during sign-up:', error);
            alert('An error occurred. Please try again.');
        }
    }

    // Function to handle the sign-in request
    async function handleSignIn() {
        // Get form values
        const email = document.getElementById('signin_email').value;
        const password = document.getElementById('signin_password').value;
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

        // Prepare data to be sent
        const signInData = new URLSearchParams();
        signInData.append('email', email);
        signInData.append('password', password);

        try {
            const response = await fetch('/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': csrfToken // Include the CSRF token in the headers
                },
                body: signInData.toString()  // URL-encoded string format

            });

            const result = await response.json();

            if (response.ok) {
                window.location.href = '/dashboard';
            } else {
                showModal(result.message, false)
            }

        } catch (error) {
            console.error('Error during sign-in:', error);
            showModal(error, false)
        }
    }
});


function checkPasswordLength() {
    const password = document.getElementById('password').value;
    const message = document.getElementById('message');

    if (password.length === 0) {
        message.style.display = 'none';  // Hide message when there's no input
    } else if (password.length < MIN_LENGTH) {
        message.textContent = `Password is too short! Minimum length is ${MIN_LENGTH} characters.`;
        message.style.display = 'block'; // Show message if password is too short
        message.style.color = 'red';     // Keep message color red
    } else {
        message.style.display = 'none';  // Hide message if password is valid
    }
}


