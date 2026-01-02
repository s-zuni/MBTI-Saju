import React, { useState } from 'react';
import { supabase } from '../supabaseClient'; // Adjust path if necessary

const MBTI_TYPES = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')); // Every 5 minutes

const AnalysisModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1); // 1: Data Input, 2: Account Creation
  const [name, setName] = useState('');
  const [gender, setGender] = useState(''); // 'male', 'female'
  const [mbti, setMbti] = useState('');
  const [birthDate, setBirthDate] = useState(''); // YYYY-MM-DD
  const [birthHour, setBirthHour] = useState('00');
  const [birthMinute, setBirthMinute] = useState('00');
  const [unknownBirthTime, setUnknownBirthTime] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  if (!isOpen) return null;

  const handleNext = () => {
    // Basic validation for Step 1 before proceeding
    if (!name || !gender || !mbti || !birthDate) {
      setAuthError('Please fill in all required fields in Step 1.');
      return;
    }
    setAuthError(''); // Clear any previous errors
    setStep(2);
  };

  const handleBirthDateChange = (e) => {
    setBirthDate(e.target.value);
  };

  const handleEmailSignup = async () => {
    setLoading(true);
    setAuthError('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) {
        setAuthError('Sign up failed: No user data received.');
        return;
      }

      // If signup successful, save profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            name: name,
            gender: gender,
            mbti: mbti,
            birth_date: birthDate,
            birth_time: unknownBirthTime ? 'Unknown' : `${birthHour}:${birthMinute}`,
            email: email, // Store email in profile for easy access
          },
        ]);

      if (profileError) throw profileError;

      alert('Account created successfully! Please check your email to verify your account.');
      onClose(); // Close modal on success

    } catch (error) {
      setAuthError(error.message || 'An unexpected error occurred during signup.');
      console.error('Email Signup Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setAuthError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin, // Redirects back to your app after Google login
        },
      });

      if (error) throw error;
      // Supabase will handle redirection and session creation

    } catch (error) {
      setAuthError(error.message || 'An unexpected error occurred during Google signup.');
      console.error('Google Signup Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="relative p-8 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          {step === 1 ? 'Start Your Free Analysis' : 'Create Your Account'}
        </h3>
        {authError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{authError}</span>
          </div>
        )}
        {step === 1 && (
          // Step 1: Data Input
          <div>
            <p className="text-gray-700 mb-4">
              Please enter your details for a personalized MBTI & Saju analysis.
            </p>
            <form className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <input
                      id="gender-male"
                      name="gender"
                      type="radio"
                      value="male"
                      checked={gender === 'male'}
                      onChange={(e) => setGender(e.target.value)}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                    />
                    <label htmlFor="gender-male" className="ml-2 block text-sm text-gray-900">
                      Male
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="gender-female"
                      name="gender"
                      type="radio"
                      value="female"
                      checked={gender === 'female'}
                      onChange={(e) => setGender(e.target.value)}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                    />
                    <label htmlFor="gender-female" className="ml-2 block text-sm text-gray-900">
                      Female
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="mbti" className="block text-sm font-medium text-gray-700">
                  MBTI Type
                </label>
                <select
                  id="mbti"
                  name="mbti"
                  value={mbti}
                  onChange={(e) => setMbti(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                >
                  <option value="">Select MBTI</option>
                  {MBTI_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
                  Birth Date (Gregorian)
                </label>
                <input
                  type="date"
                  name="birthDate"
                  id="birthDate"
                  value={birthDate}
                  onChange={handleBirthDateChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label htmlFor="birthHour" className="block text-sm font-medium text-gray-700">
                    Birth Hour
                  </label>
                  <select
                    id="birthHour"
                    name="birthHour"
                    value={birthHour}
                    onChange={(e) => setBirthHour(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    disabled={unknownBirthTime}
                  >
                    {HOURS.map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label htmlFor="birthMinute" className="block text-sm font-medium text-gray-700">
                    Birth Minute
                  </label>
                  <select
                    id="birthMinute"
                    name="birthMinute"
                    value={birthMinute}
                    onChange={(e) => setBirthMinute(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    disabled={unknownBirthTime}
                  >
                    {MINUTES.map((minute) => (
                      <option key={minute} value={minute}>
                        {minute}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="unknownBirthTime"
                  name="unknownBirthTime"
                  type="checkbox"
                  checked={unknownBirthTime}
                  onChange={(e) => setUnknownBirthTime(e.target.checked)}
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
                <label htmlFor="unknownBirthTime" className="ml-2 block text-sm text-gray-900">
                  Unknown Birth Time
                </label>
              </div>
            </form>

            <div className="mt-6 flex justify-end gap-x-4">
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                onClick={handleNext}
                disabled={loading}
              >
                Next
              </button>
            </div>
          </div>
        )}
        {step === 2 && (
          // Step 2: Account Creation
          <div>
            <p className="text-gray-700 mb-4">
              Create an account to save and view your analysis results.
            </p>
            <form className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                    </label>
                    <input
                        type="email"
                        name="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                    </label>
                    <input
                        type="password"
                        name="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                    />
                </div>
            </form>
            <div className="mt-6 flex flex-col space-y-4">
                <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={handleEmailSignup}
                    disabled={loading}
                >
                    {loading ? 'Signing Up...' : 'Sign Up with Email'}
                </button>
                <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={handleGoogleSignup}
                    disabled={loading}
                >
                    Sign Up with Google
                </button>
            </div>
            <div className="mt-6 flex justify-start">
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Back
              </button>
            </div>
          </div>
        )}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          onClick={onClose}
          disabled={loading}
        >
          <span className="sr-only">Close</span>
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AnalysisModal;
