import { User, createUserWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';
// eslint-disable-next-line import/no-unresolved
import { auth, db } from '../config/initialiseFirebase';


interface AuthContextType {
    user: User | null;
    loading: boolean;
    signUp: (email: string, password: string, name: string, location: string) => Promise<{ error: any }>;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
}    

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({children}: {children: ReactNode}) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();

    }, []);

    const signUp = async (email: string, password: string, name: string, location: string) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            const newUser = userCredential.user;

            await updateProfile(newUser, {displayName: name});

            await setDoc(doc(db, 'users', newUser.uid), {
                uid: newUser.uid,
                name,
                email,
                location,
                createdAt: new Date()
            });

            return {error: null};

        } catch (error: any) {

            return {error};

        }
    };

    const signIn = async (email: string, password: string) => {

        try {
            await signInWithEmailAndPassword(auth, email, password);
            return {error: null};
        } catch (error: any) {
            return {error};
        }
    };

    const signOut = async () => {

        await firebaseSignOut(auth);

    };

    const value = {user, loading, signUp, signIn, signOut};
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
