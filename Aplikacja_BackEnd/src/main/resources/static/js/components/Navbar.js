// Navbar Component - polska wersja
const Navbar = ({ isLoggedIn, userInfo, onLogout, onShowLogin }) => {
    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow">
            <div className="container">
                <a className="navbar-brand fw-bold" href="/">
                    <span className="me-2">🛒</span>
                    Asystent Zakupów
                </a>

                <div className="navbar-nav ms-auto">
                    {isLoggedIn ? (
                        <div className="d-flex align-items-center">
                            <span className="text-white me-3">
                                Witaj, <strong>{userInfo?.username}!</strong>
                            </span>
                            <button
                                className="btn btn-outline-light btn-sm"
                                onClick={onLogout}
                            >
                                Wyloguj
                            </button>
                        </div>
                    ) : (
                        <button
                            className="btn btn-light"
                            onClick={onShowLogin}
                        >
                            Zaloguj / Zarejestruj
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
};

// Make it globally available
window.Navbar = Navbar;