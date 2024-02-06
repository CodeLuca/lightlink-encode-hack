import { useEffect, useState } from 'react';
import { useMoonSDK } from '../hooks/moon';

function LoginControl() {
  const { moon, initialize, disconnect } = useMoonSDK();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      if (!moon) {
        console.error('User not authenticated');
        return;
      }

      const message = await moon.getAuthSDK().emailLogin({
        email,
        password,
      });
      const { token, refreshToken } = message.data;

      moon.updateToken(token);
      moon.updateRefreshToken(refreshToken);
      const acc = await moon.listAccounts();
      console.log({ acc })

      setIsLoggedIn(true);
      window.location.reload();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    setIsLoading(true);
    try {
      if (!moon) {
        console.error('User not authenticated');
        return;
      }

      const message = await moon.getAuthSDK().emailSignup({
        email,
        password,
      });
      console.log(message);
      window.location.reload();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initialize();

    return () => {
      disconnect();
    };
  }, []);

  if (isLoggedIn) {
    return (
      <div className="flex items-center justify-center h-screen">
        <h2 className="text-2xl font-semibold">Welcome back!</h2>
      </div>
    );
  } else {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-white p-8 rounded shadow-md w-80">
          <h2 className="text-2xl font-semibold text-center">Login to access LightLink Dice Poker</h2>
          <div className="text-center w-full mb-6 text-sm mt-2">You are logging into / creating a usemoon.ai custodial wallet</div>
          <form>
            <div className="mb-4">
              <label className="block text-gray-700">Email:</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700">Password:</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />
            </div>
            <button type="button" onClick={handleLogin} disabled={isLoading} className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 mb-4">
              {isLoading ? 'Loading...' : 'Login'}
            </button>
            <button type="button" onClick={handleSignup} disabled={isLoading} className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-500">
              {isLoading ? 'Loading...' : 'Sign up'}
            </button>
          </form>
        </div>
      </div>
    );
  }
}

export default LoginControl;