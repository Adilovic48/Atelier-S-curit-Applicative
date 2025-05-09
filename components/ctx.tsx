import { useContext, createContext, type PropsWithChildren } from 'react';
import { useStorageState } from '@/hooks/useStorageState';
import * as SecureStore from "expo-secure-store";
import {ACCESS_TOKEN} from "@/constants/StorageKeys";
import {jwtDecode} from "jwt-decode";
import { View, ActivityIndicator } from "react-native";
import { fetch as sslFetch } from 'react-native-ssl-pinning';


const AuthContext = createContext<{
  signIn: () => Promise<void>;
  signOut: () => void;
  session?: string | null;
  isLoading: boolean;
}>({
  signIn: () => Promise.resolve(),
  signOut: () => null,
  session: null,
  isLoading: false,
});


export function useSession() {
  const value = useContext(AuthContext);
  if (process.env.NODE_ENV !== 'production') {
    if (!value) {
      throw new Error('useSession must be wrapped in a <SessionProvider />');
    }
  }

  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [[isLoading, session], setSession] = useStorageState('session');

  return (
    <AuthContext.Provider
      value={{
        signIn: async () => {
          const token = await SecureStore.getItemAsync(ACCESS_TOKEN)
          if (token) {
            const decoded = jwtDecode(token);
            const url = 'https://fcs.webservice.odeiapp.fr/users?email=' + (decoded as any).username;
            try {
              const response = await sslFetch('https://fcs.webservice.odeiapp.fr/auth/login', {
                method: 'GET',
                timeoutInterval: 10000,
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                  Authorization: 'Bearer ${token}',
                },
                sslPinning: {
                  certs: ['odeiapp'],
                },
              });

              const user = (await response.json())[0];
              setSession(user);
            } catch (e) {
              throw new Error('Invalid token, reconnect');
            }
          } else {
            throw new Error('No Token');
          }
        },
        signOut: async () => {
          await SecureStore.deleteItemAsync(ACCESS_TOKEN)
          setSession(null);
        },
        session,
        isLoading,
      }}>
      {children}
    </AuthContext.Provider>
  );
}