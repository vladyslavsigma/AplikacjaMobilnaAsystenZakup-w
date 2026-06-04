// RegisterForm Component - polska wersja
const RegisterForm = ({ onSwitchToLogin }) => {
    const [formData, setFormData] = React.useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [message, setMessage] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [errors, setErrors] = React.useState({});

    const validateForm = () => {
        const newErrors = {};

        if (!formData.username.trim()) {
            newErrors.username = 'Nazwa użytkownika jest wymagana';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Nazwa użytkownika musi mieć co najmniej 3 znaki';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email jest wymagany';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email jest nieprawidłowy';
        }

        if (!formData.password) {
            newErrors.password = 'Hasło jest wymagane';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Hasło musi mieć co najmniej 6 znaków';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Hasła nie są identyczne';
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
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password
                })
            });

            const result = await response.json();
            setMessage(result.message || result);

            if (response.ok) {
                setFormData({
                    username: '',
                    email: '',
                    password: '',
                    confirmPassword: ''
                });
                setErrors({});

                setTimeout(() => {
                    alert('Rejestracja zakończona sukcesem! Możesz się teraz zalogować.');
                    if (onSwitchToLogin) {
                        onSwitchToLogin();
                    }
                }, 100);
            }
        } catch (error) {
            setMessage('Rejestracja nie powiodła się. Sprawdź połączenie i spróbuj ponownie.');
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="card shadow-lg">
            <div className="card-header bg-primary text-white text-center py-4">
                <h2 className="mb-0">Utwórz Konto</h2>
                <p className="mb-0 mt-2 opacity-75">Dołącz do naszej platformy już dziś</p>
            </div>
            <div className="card-body p-4">
                {message && (
                    <div className={`alert ${message.includes('sukcesem') ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`} role="alert">
                        {message}
                        <button type="button" className="btn-close" onClick={() => setMessage('')}></button>
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="mb-3">
                        <label htmlFor="username" className="form-label fw-semibold">
                            Nazwa użytkownika <span className="text-danger">*</span>
                        </label>
                        <input
                            type="text"
                            className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Wprowadź nazwę użytkownika"
                            disabled={isLoading}
                        />
                        {errors.username && <div className="invalid-feedback">{errors.username}</div>}
                    </div>

                    <div className="mb-3">
                        <label htmlFor="email" className="form-label fw-semibold">
                            Adres email <span className="text-danger">*</span>
                        </label>
                        <input
                            type="email"
                            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Wprowadź swój email"
                            disabled={isLoading}
                        />
                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                    </div>

                    <div className="mb-3">
                        <label htmlFor="password" className="form-label fw-semibold">
                            Hasło <span className="text-danger">*</span>
                        </label>
                        <input
                            type="password"
                            className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Co najmniej 6 znaków"
                            disabled={isLoading}
                        />
                        {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                    </div>

                    <div className="mb-4">
                        <label htmlFor="confirmPassword" className="form-label fw-semibold">
                            Potwierdź hasło <span className="text-danger">*</span>
                        </label>
                        <input
                            type="password"
                            className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Wprowadź hasło ponownie"
                            disabled={isLoading}
                        />
                        {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-100 py-3 fw-bold"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Tworzenie konta...
                            </>
                        ) : 'Utwórz Konto'}
                    </button>
                </form>
            </div>
            <div className="card-footer text-center py-3 bg-light">
                <p className="mb-0">
                    Masz już konto?
                    <a href="#" className="text-decoration-none fw-semibold ms-2"
                       onClick={(e) => {
                           e.preventDefault();
                           if (onSwitchToLogin) {
                               onSwitchToLogin();
                           }
                       }}>
                        Zaloguj się
                    </a>
                </p>
            </div>
        </div>
    );
};

// Make it globally available
window.RegisterForm = RegisterForm;