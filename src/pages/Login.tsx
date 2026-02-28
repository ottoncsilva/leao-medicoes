<<<<<<< HEAD
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Lock, User, Mail } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function Login() {
  const navigate = useNavigate();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstAccess, setIsFirstAccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Acesso Master (Gestor Lázaro)
      if (login === 'admin' && password === 'Dell&7567') {
        navigate('/admin');
        return;
      }

      if (login === 'admin') {
        setError('Senha incorreta para o administrador.');
        setIsLoading(false);
        return;
      }

      const email = login.toLowerCase().trim();

      if (isFirstAccess) {
        // Fluxo de Primeiro Acesso (Cadastro de Senha)
        // 1. Verificar se o e-mail foi cadastrado pelo gestor
        const q = query(collection(db, 'clients'), where('contact', '==', email));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          throw new Error('Este e-mail não foi cadastrado pelo gestor. Entre em contato com a Leão Medições.');
        }

        // 2. Criar o usuário no Firebase Auth
        await createUserWithEmailAndPassword(auth, email, password);
        navigate('/portal');
        
      } else {
        // Fluxo de Login Normal
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/portal');
      }

    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já possui uma senha cadastrada. Use a aba "Entrar".');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError(err.message || 'Ocorreu um erro ao tentar acessar.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-950 p-8 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-slate-900" />
          </div>
          <h1 className="text-2xl font-bold text-white">Leão Medições</h1>
          <p className="text-slate-400 mt-2 text-sm">Portal de Agendamento</p>
        </div>
        
        <div className="p-8">
          {/* Tabs */}
          <div className="flex mb-6 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => { setIsFirstAccess(false); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${!isFirstAccess ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setIsFirstAccess(true); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${isFirstAccess ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Primeiro Acesso
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center font-medium">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {isFirstAccess ? 'E-mail cadastrado pela Leão Medições' : 'E-mail ou Usuário'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {isFirstAccess ? <Mail className="h-5 w-5 text-slate-400" /> : <User className="h-5 w-5 text-slate-400" />}
                </div>
                <input
                  type={isFirstAccess ? "email" : "text"}
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm"
                  placeholder={isFirstAccess ? "seu@email.com" : "admin ou seu@email.com"}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {isFirstAccess ? 'Crie uma Senha' : 'Senha'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              {isFirstAccess && <p className="text-xs text-slate-500 mt-2">Mínimo de 6 caracteres.</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-950 hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-950 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Aguarde...' : (isFirstAccess ? 'Criar Senha e Acessar' : 'Entrar')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
=======
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Lock, User, Mail } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function Login() {
  const navigate = useNavigate();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstAccess, setIsFirstAccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Acesso Master (Gestor Lázaro)
      if (login === 'admin' && password === 'Dell&7567') {
        navigate('/admin');
        return;
      }

      if (login === 'admin') {
        setError('Senha incorreta para o administrador.');
        setIsLoading(false);
        return;
      }

      const email = login.toLowerCase().trim();

      if (isFirstAccess) {
        // Fluxo de Primeiro Acesso (Cadastro de Senha)
        // 1. Verificar se o e-mail foi cadastrado pelo gestor
        const q = query(collection(db, 'clients'), where('contact', '==', email));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          throw new Error('Este e-mail não foi cadastrado pelo gestor. Entre em contato com a Leão Medições.');
        }

        // 2. Criar o usuário no Firebase Auth
        await createUserWithEmailAndPassword(auth, email, password);
        navigate('/portal');
        
      } else {
        // Fluxo de Login Normal
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/portal');
      }

    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já possui uma senha cadastrada. Use a aba "Entrar".');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError(err.message || 'Ocorreu um erro ao tentar acessar.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-950 p-8 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-slate-900" />
          </div>
          <h1 className="text-2xl font-bold text-white">Leão Medições</h1>
          <p className="text-slate-400 mt-2 text-sm">Portal de Agendamento</p>
        </div>
        
        <div className="p-8">
          {/* Tabs */}
          <div className="flex mb-6 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => { setIsFirstAccess(false); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${!isFirstAccess ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setIsFirstAccess(true); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${isFirstAccess ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Primeiro Acesso
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center font-medium">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {isFirstAccess ? 'E-mail cadastrado pela Leão Medições' : 'E-mail ou Usuário'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {isFirstAccess ? <Mail className="h-5 w-5 text-slate-400" /> : <User className="h-5 w-5 text-slate-400" />}
                </div>
                <input
                  type={isFirstAccess ? "email" : "text"}
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm"
                  placeholder={isFirstAccess ? "seu@email.com" : "admin ou seu@email.com"}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {isFirstAccess ? 'Crie uma Senha' : 'Senha'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              {isFirstAccess && <p className="text-xs text-slate-500 mt-2">Mínimo de 6 caracteres.</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-950 hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-950 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Aguarde...' : (isFirstAccess ? 'Criar Senha e Acessar' : 'Entrar')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
>>>>>>> 0e85a4bbb0746910d0bf74ab9d34173325ff70eb
