import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BookOpen, LogIn, AlertCircle, Loader2, Sparkles, User, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getErrorMessage } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else {
        navigate(user.role === 'admin' ? '/admin' : '/author', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, location.state]);

  const onSubmit = async (data: LoginFormData) => {
    setAuthError(null);
    try {
      const loggedUser = await login(data);
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else {
        navigate(loggedUser.role === 'admin' ? '/admin' : '/author', { replace: true });
      }
    } catch (err) {
      setAuthError(getErrorMessage(err));
    }
  };

  const handleFillDemo = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    setAuthError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-white shadow-lg mb-3">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">BookLeaf Publishing</h1>
          <p className="text-sm text-slate-600 mt-1">Author Support &amp; Operations Portal</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg border-slate-200">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold">Sign In</CardTitle>
            <CardDescription>
              Enter your registered BookLeaf email and password to access your portal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {authError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-red-600 font-medium">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-red-600 font-medium">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            {/* Quick Demo Credentials Helper */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Evaluation Demo Accounts</span>
              </div>
              <div className="flex flex-col gap-2">
                {/* Author Demo 1 */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-200 bg-emerald-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 leading-tight">Author Demo 1</p>
                      <p className="text-[11px] text-slate-500 truncate">priya.sharma@email.com · author123</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFillDemo('priya.sharma@email.com', 'author123')}
                    className="ml-2 shrink-0 text-[11px] font-semibold text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-100 rounded px-2 py-1 transition-colors"
                  >
                    Use
                  </button>
                </div>
                {/* Author Demo 2 */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-teal-200 bg-teal-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 leading-tight">Author Demo 2</p>
                      <p className="text-[11px] text-slate-500 truncate">rohit.kapoor@email.com · author123</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFillDemo('rohit.kapoor@email.com', 'author123')}
                    className="ml-2 shrink-0 text-[11px] font-semibold text-teal-700 bg-white border border-teal-300 hover:bg-teal-100 rounded px-2 py-1 transition-colors"
                  >
                    Use
                  </button>
                </div>
                {/* Admin Demo */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-indigo-200 bg-indigo-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 leading-tight">Admin Demo</p>
                      <p className="text-[11px] text-slate-500 truncate">admin@bookleaf.pub · see README</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFillDemo('admin@bookleaf.pub', 'admin123')}
                    className="ml-2 shrink-0 text-[11px] font-semibold text-indigo-700 bg-white border border-indigo-300 hover:bg-indigo-100 rounded px-2 py-1 transition-colors"
                  >
                    Use
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-slate-400 text-center">
                Demo credentials — development environment only
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center text-xs text-slate-400">
            Protected by secure HTTP-only cookies
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

