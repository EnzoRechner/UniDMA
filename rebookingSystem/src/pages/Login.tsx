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
        }
    }

  return (
    <div>
      <div className="">
        <h1>Welcome Back</h1>
        <p>Sign in to your Book One account</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="form">
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            placeholder="Enter your email"
            {...register('email')}
          />
          {errors.email && <p className="text-red-500">{errors.email.message}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            placeholder="Enter your password"
            {...register('password')}
          />
          {errors.password && <p className="text-red-500">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="">
        <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
      </div>
    </div>
  );
}

export default LoginForm;