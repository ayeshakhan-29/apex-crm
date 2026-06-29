'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const router = useRouter();
    const { login, loading, error: authError, isAuthenticated } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: '' });
        }
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            await login({
                email: formData.email,
                password: formData.password,
            });
            router.push('/');
        } catch (err) {
            console.error('Login failed:', err);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-6 lg:px-8">
            <div className="absolute inset-0 z-0 pointer-events-none bg-[linear-gradient(rgba(15,118,110,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,118,110,0.045)_1px,transparent_1px)] bg-[size:36px_36px]" />

            <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-2xl border border-teal-900/10 bg-white shadow-[0_24px_70px_-42px_rgba(15,23,42,0.65)] lg:grid lg:grid-cols-[0.9fr_1.1fr]">
                <div className="hidden flex-col justify-between bg-slate-950 px-10 py-10 text-white lg:flex">
                    <div>
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg shadow-teal-900/30">
                            <span className="text-sm font-bold">R</span>
                        </div>
                        <h1 className="mt-8 text-2xl font-bold tracking-tight">Apex CRM</h1>
                        <p className="mt-3 max-w-xs text-sm font-medium leading-6 text-slate-300">
                            Manage leads, tasks, meetings, and pipeline activity from one focused workspace.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-300">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">Pipeline</div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">Tasks</div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">Leads</div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">Calendar</div>
                    </div>
                </div>

                <div className="space-y-9 p-6 sm:p-10 lg:p-12">
                    <div>
                        <div className="mb-7 inline-flex items-center rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary lg:hidden">
                            Apex CRM
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-950">Welcome back</h2>
                        <p className="mt-3 text-sm font-medium text-slate-500">Sign in to continue to your CRM workspace.</p>
                    </div>

                    <form className="space-y-7" onSubmit={handleSubmit}>
                        {authError && (
                            <div className="rounded-xl border border-red-100 bg-red-50 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <p className="text-center text-xs font-semibold uppercase tracking-wider text-red-600">{authError}</p>
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="group">
                                <label htmlFor="email" className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-500 transition-colors group-focus-within:text-primary">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={`w-full rounded-xl border bg-slate-50 py-4 pl-11 pr-5 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none transition-all duration-300 ${errors.email ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10'}`}
                                        placeholder="name@company.com"
                                    />
                                </div>
                                {errors.email && <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-red-500">{errors.email}</p>}
                            </div>

                            <div className="group">
                                <div className="mb-2 flex items-center justify-between">
                                    <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 transition-colors group-focus-within:text-primary">
                                        Password
                                    </label>
                                    <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-primary transition-colors hover:text-primary-hover">
                                        Forgot?
                                    </a>
                                </div>
                                <div className="relative">
                                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className={`w-full rounded-xl border bg-slate-50 py-4 pl-11 pr-14 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none transition-all duration-300 ${errors.password ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10'}`}
                                        placeholder="Enter password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-5 text-slate-400 transition-colors hover:text-slate-600"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {errors.password && <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-red-500">{errors.password}</p>}
                            </div>
                        </div>

                        <div className="flex items-center">
                            <label className="group flex cursor-pointer items-center">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                    />
                                    <div className={`h-5 w-10 rounded-full transition-colors duration-300 ${rememberMe ? 'bg-primary' : 'bg-slate-200'}`} />
                                    <div className={`absolute left-1 top-1 h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-300 ${rememberMe ? 'translate-x-5' : ''}`} />
                                </div>
                                <span className="ml-3 text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors group-hover:text-slate-700">Remember me</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center rounded-xl border border-transparent bg-primary px-6 py-4 text-xs font-bold text-white shadow-[0_14px_28px_-14px_rgba(15,118,110,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_18px_34px_-16px_rgba(15,118,110,0.9)] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <span className="-ml-1 mr-3 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-b-white" />
                                    VERIFYING...
                                </span>
                            ) : (
                                <span className="uppercase tracking-[0.2em]">Sign In</span>
                            )}
                        </button>
                    </form>

                    <div className="text-center">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                            New to Apex CRM? <Link href="/register" className="border-b border-primary/30 text-primary transition-all hover:border-primary hover:text-primary-hover">Create Account</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}