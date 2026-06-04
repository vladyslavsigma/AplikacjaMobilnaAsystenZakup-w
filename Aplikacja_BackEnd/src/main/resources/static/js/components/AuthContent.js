window.AuthContent = function AuthContent(props) {
    const user = props.user;

    if (user) {
        return React.createElement(
            "div",
            null,
            React.createElement("h2", null, "Witaj, " + user.name + "!")
        );
    }

    return React.createElement(
        "div",
        { className: "row gap-3" },
        React.createElement(window.LoginForm, null),
        React.createElement(window.RegisterForm, null)
    );
};
