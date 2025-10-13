import React, {useState} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object ({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Invalid password"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

    const onSubmit = async (data: LoginFormData) => {
        try {
            setError(null);
            await signIn(data.email, data.password);
            navigate('/');
        } catch (error: any) {

          if (error.code == 'auth/invalid-credentials') {
            setError('Invalid email or password');
          } else if (error.code == 'auth/user-not-found') {
            setError('No account found with this email');
          } else if (error.code == 'auth/wrong-password') {
            setError('Incorrect password');
          } else if (error.code == 'auth/too-many-requests') {
            setError('Too many failed login attempts. Please try again later.');
          } else {
            setError('Failed to log in. Please try again.');
          } 