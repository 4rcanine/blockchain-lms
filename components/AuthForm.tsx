// components/AuthForm.tsx
'use client';

import { useState } from 'react';

export type UserRole = 'student' | 'educator' | 'admin';

interface AuthFormProps {
  mode: 'login' | 'signup';
  onSubmit: (event: React.FormEvent<HTMLFormElement>, email: string, pass: string, role?: UserRole) => void;
}

export default function AuthForm({ mode, onSubmit }: AuthFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // --- NEW STATE for the selected role ---
    const [selectedRole, setSelectedRole] = useState<UserRole>('student');

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // Pass the selected role to the parent's onSubmit function
        onSubmit(event, email, password, mode === 'signup' ? selectedRole : undefined);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <form onSubmit={handleSubmit} className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-800">
                    {mode === 'login' ? 'Welcome Back!' : 'Create Your Account'}
                </h2>
                
                {/* --- NEW ROLE SELECTOR --- */}
                {/* This block only renders when in signup mode */}
                {mode === 'signup' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">I am signing up as a...</label>
                        <div className="flex justify-around">
                            {(['student', 'educator'] as UserRole[]).map((role) => (
                                <label key={role} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="role"
                                        value={role}
                                        checked={selectedRole === role}
                                        onChange={() => setSelectedRole(role)}
                                        className="form-radio h-4 w-4 text-indigo-600"
                                    />
                                    <span className="capitalize">{role}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- Existing Email and Password fields --- */}
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md" />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                    <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md" />
                </div>
                
                <div>
                    <button type="submit" className="w-full px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                        {mode === 'login' ? 'Login' : 'Sign Up'}
                    </button>
                </div>
            </form>
        </div>
    );
}