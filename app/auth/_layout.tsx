import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index"       options={{ animation: 'fade' }} />
      <Stack.Screen name="login"       />
      <Stack.Screen name="signup"      />
      <Stack.Screen name="verify"      />
      <Stack.Screen name="forgot"      />
      <Stack.Screen name="name"        />
      <Stack.Screen name="preferences" />
    </Stack>
  );
}
