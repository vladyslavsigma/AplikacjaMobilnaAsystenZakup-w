// Footer Component
function Footer() {
    return (
        <footer className="bg-dark text-white py-4 mt-5">
            <div className="container">
                <div className="row">
                    <div className="col-md-6">
                        <h5>Shop Rental</h5>
                        <p className="mb-0 text-white-50">Your trusted rental platform for all your needs.</p>
                    </div>
                    <div className="col-md-6 text-md-end">
                        <p className="mb-0 text-white-50">&copy; 2024 Shop Rental. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </footer>
    );
}

// Make it globally available
window.Footer = Footer;