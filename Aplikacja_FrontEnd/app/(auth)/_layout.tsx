import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="login"
                options={{
                    title: 'Logowanie',
                    headerShown: false
                }}
            />
            <Stack.Screen
                name="register"
                options={{
                    title: 'Rejestracja',
                    headerShown: false
                }}
            />
        </Stack>
    );
}