// Main App Component - z poprawionym userId
const App = () => {
    const [isLoggedIn, setIsLoggedIn] = React.useState(false);
    const [userInfo, setUserInfo] = React.useState(null);
    const [showLoginForm, setShowLoginForm] = React.useState(false);

    React.useEffect(() => {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        const email = localStorage.getItem('email');

        if (token && username && email) {
            setIsLoggedIn(true);
            setUserInfo({
                username,
                email,
                id: email // Używamy email jako ID dla backendu
            });
        }

        if (window.location.hash === '#login') {
            setShowLoginForm(true);
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('email');
        setIsLoggedIn(false);
        setUserInfo(null);
        window.location.hash = '';
        window.location.reload();
    };

    const handleShowLogin = () => {
        window.location.hash = '#login';
        window.location.reload();
    };

    const showLogin = () => {
        setShowLoginForm(true);
    };

    const showRegister = () => {
        setShowLoginForm(false);
    };

    const handleLoginSuccess = (result) => {
        setIsLoggedIn(true);
        setUserInfo({
            username: result.username || 'Użytkownik',
            email: result.email,
            id: result.email // Używamy email jako ID
        });
        window.location.hash = '';
        window.location.reload();
    };

    // Dashboard dla zalogowanych użytkowników
    if (isLoggedIn && userInfo) {
        return (
            <div className="app-container">
                <Navbar
                    isLoggedIn={isLoggedIn}
                    userInfo={userInfo}
                    onLogout={handleLogout}
                    onShowLogin={handleShowLogin}
                />

                <Dashboard
                    userInfo={userInfo}
                    onLogout={handleLogout}
                />
            </div>
        );
    }

    // Formularze dla niezalogowanych użytkowników
    return (
        <div className="app-container">
            <Navbar
                isLoggedIn={isLoggedIn}
                userInfo={userInfo}
                onLogout={handleLogout}
                onShowLogin={handleShowLogin}
            />

            <div className="container mt-5">
                <div className="row justify-content-center">
                    <div className="col-md-8">
                        <div className="text-center mb-5">
                            <h1 className="display-4 text-primary mb-4">Asystent Zakupów</h1>
                            <p className="lead mb-4">
                                Porównuj ceny w różnych sklepach i oszczędzaj na zakupach!
                            </p>
                            <div className="row mt-4">
                                <div className="col-md-4 mb-4">
                                    <div className="card h-100 border-0 shadow-sm">
                                        <div className="card-body">
                                            <div className="display-4 mb-3">📝</div>
                                            <h5>Twórz Listy</h5>
                                            <p>Twórz i zarządzaj swoimi listami zakupów</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4 mb-4">
                                    <div className="card h-100 border-0 shadow-sm">
                                        <div className="card-body">
                                            <div className="display-4 mb-3">💰</div>
                                            <h5>Porównuj Ceny</h5>
                                            <p>Porównuj ceny produktów w różnych sklepach</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4 mb-4">
                                    <div className="card h-100 border-0 shadow-sm">
                                        <div className="card-body">
                                            <div className="display-4 mb-3">🏆</div>
                                            <h5>Oszczędzaj</h5>
                                            <p>Znajdź najlepsze okazje i oszczędzaj na zakupach</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="row justify-content-center">
                            <div className="col-md-6">
                                {showLoginForm ?
                                    <LoginForm
                                        onSwitchToRegister={showRegister}
                                        onLoginSuccess={handleLoginSuccess}
                                    /> :
                                    <RegisterForm
                                        onSwitchToLogin={showLogin}
                                        onRegisterSuccess={handleLoginSuccess}
                                    />
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Render the app
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);