import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { LoginScreen } from '../screens/auth/LoginScreen'
import { RegisterScreen } from '../screens/auth/RegisterScreen'
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen'
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen'
import type { AuthStackParamList } from './types'

const Stack = createNativeStackNavigator<AuthStackParamList>()

interface AuthStackProps {
  initialRouteName?: keyof AuthStackParamList
  initialParams?: Record<string, string>
}

export function AuthStack({ initialRouteName, initialParams }: AuthStackProps) {
  const { t } = useTranslation()

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerStyle: { backgroundColor: '#0284c7' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: t('navigation.auth.signIn') }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: t('navigation.auth.createAccount') }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: t('navigation.auth.forgotPassword') }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        initialParams={initialParams}
        options={{ title: t('navigation.auth.resetPassword') }}
      />
    </Stack.Navigator>
  )
}
