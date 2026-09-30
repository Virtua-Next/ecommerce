import { z } from 'zod';


export const LoginSchema = z.object({
  user_email: z.email(),
  user_password: z.string().min(8)
});

export type ILogin = z.infer<typeof LoginSchema>;
