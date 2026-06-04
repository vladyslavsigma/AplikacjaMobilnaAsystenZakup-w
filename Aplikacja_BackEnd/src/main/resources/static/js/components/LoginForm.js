// LoginForm Component - polska wersja
const LoginForm = ({ onSwitchToRegister, onLoginSuccess }) => {
    const [formData, setFormData] = React.useState({
        email: '',
        password: ''
    });
    const [message, setMessage] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [errors, setErrors] = React.useState({});

    const validateForm = () => {
        const newErrors = {};

        if (!formData.email.trim()) {
            newErrors.email = 'Email jest wymagany';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email jest nieprawidłowy';
        }

        if (!formData.password) {
            newErrors.password = 'Hasło jest wymagane';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        if (errors[e.target.name]) {
            setErrors({
                ...errors,
                [e.target.name]: ''
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setMessage('');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            });

            let result;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                result = await response.json();
            } else {
                result = await response.text();
            }

            setMessage(typeof result === 'object' ? result.message : result);

            if (response.ok) {
                localStorage.setItem('token', result.token || 'dummy-token');
                localStorage.setItem('username', result.username || 'Użytkownik');
                localStorage.setItem('email', result.email || formData.email);

                if (onLoginSuccess) {
                    onLoginSuccess(result);
                }
            }
        } catch (error) {
            setMessage('Logowanie nie powiodło się. Sprawdź połączenie i spróbuj ponownie.');
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="card shadow-lg">
            <div className="card-header bg-success text-white text-center py-4">
                <h2 className="mb-0">Zaloguj się</h2>
                <p className="mb-0 mt-2 opacity-75">Witamy ponownie!</p>
            </div>
            <div className="card-body p-4">
                {message && (
                    <div className={`alert ${message.includes('udane') ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`} role="alert">
                        {message}
                        <button type="button" className="btn-close" onClick={() => setMessage('')}></button>
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="mb-3">
                        <label htmlFor="loginEmail" className="form-label fw-semibold">
                            Adres email <span className="text-danger">*</span>
                        </label>
                        <input
                            type="email"
                            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                            id="loginEmail"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Wprowadź swój email"
                            disabled={isLoading}
                        />
                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                    </div>

                    <div className="mb-4">
                        <label htmlFor="loginPassword" className="form-label fw-semibold">
                            Hasło <span className="text-danger">*</span>
                        </label>
                        <input
                            type="password"
                            className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                            id="loginPassword"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Wprowadź swoje hasło"
                            disabled={isLoading}
                        />
                        {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-success w-100 py-3 fw-bold"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Logowanie...
                            </>
                        ) : 'Zaloguj się'}
                    </button>
                </form>
            </div>
            <div className="card-footer text-center py-3 bg-light">
                <p className="mb-0">
                    Nie masz konta?
                    <a href="#" className="text-decoration-none fw-semibold ms-2"
                       onClick={(e) => {
                           e.preventDefault();
                           if (onSwitchToRegister) {
                               onSwitchToRegister();
                           }
                       }}>
                        Zarejestruj się
                    </a>
                </p>
            </div>
        </div>
    );
};

// Make it globally available
window.LoginForm = LoginForm;