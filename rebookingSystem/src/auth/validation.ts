import { z } from 'zod';

export const signUpSchema = z.object({
    
    username: z.string().min(2, "Username must be at least 2 characters long"),
    
    email: z.email("Invalid email address"),

    password: z.string().min(6, "Password must be at least 6 characters long").regex(/[0-9]/, "Password must contain at least one number").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
    
    location: z.enum(['locPaarl', 'locOudeWesthof', 'locSomersetWest'], "Please select a valid location"),

});
