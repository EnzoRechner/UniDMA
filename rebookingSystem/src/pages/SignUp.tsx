import React, {useState} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const signUpSchema = z.object({


    username: z.string().min(2, "Username must be at least 2 characters long"),

    email: z.string().email("Invalid email address"),

    password: z.string()
    .min(6, "Password must be at least 6 characters long")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
    
    location: z.enum(['locPaarl', 'locOudeWesthof', 'locSomersetWest'], "Please select a valid location"),

});

type SignUpFormData = z.infer<typeof signUpSchema>;

export function SignUpForm() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [submittedError, setSubmittedError] = useState<string | null>(null);


  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormData) => {
    try {
      const { error } = await signUp(
        data.email,
        data.password,
        data.username,
        data.location
      );
      if (error) {
        setSubmittedError(error.message);
      } else {
        navigate('/');
      }
    } catch (error: any) {
      setSubmittedError(error.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <div>
        <h1>Join Book One</h1>
        <p>Create your account to start booking</p>
      </div>

      {submittedError && <p className="error-message">{submittedError}</p>}

      <form onSubmit={handleSubmit(onSubmit)}>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          placeholder="Enter your username"
          {...register("username")}
        />
        {errors.username && <p className="error-message">{errors.username.message}</p>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          placeholder="Enter your email"
          {...register("email")}
        />
        {errors.email && <p className="error-message">{errors.email.message}</p>}

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          placeholder="Create a password"
          {...register("password")}
        />
        {errors.password && <p className="error-message">{errors.password.message}</p>}

        <label htmlFor="location">Location</label>
        <select id="location" {...register("location")}>
          <option value="">Select your location</option>
          <option value="locPaarl">Paarl</option>
          <option value="locOudeWesthof">Oude Westhof</option>
          <option value="locSomersetWest">Somerset West</option>
        </select>
        {errors.location && <p className="error-message">{errors.location.message}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <div>
        <p>
          Already have an account?{" "}
          <Link to="/login">Log In</Link>
        </p>
      </div>
    </>
  );
}

export default SignUpForm;