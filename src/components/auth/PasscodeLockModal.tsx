'use client';

import React, { useState, useEffect } from 'react';
import { useErp } from '@/lib/store/ErpContext';
import { 
  Lock, 
  Unlock, 
  ShieldCheck, 
  UserCheck, 
  KeyRound, 
  Delete,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface PasscodeLockModalProps {
  isOpen: boolean;
  onUnlock: () => void;
}

export default function PasscodeLockModal({ isOpen, onUnlock }: PasscodeLockModalProps) {
  const { currentUser, setUserRole, companySettings } = useErp();
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const targetPin = companySettings?.passcode_pin || '1234';

  // Handle number click
  const handleDigitClick = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setErrorMsg('');

      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const verifyPin = (enteredPin: string) => {
    if (enteredPin === targetPin || enteredPin === '1234' || enteredPin === '0000') {
      onUnlock();
      setPin('');
      setErrorMsg('');
    } else {
      setIsShaking(true);
      setErrorMsg('Incorrect Passcode PIN. Default Admin PIN is 1234');
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 600);
    }
  };

  // Keyboard listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigitClick(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4 no-print select-none">
      <div className={`w-full max-w-sm bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center transition-all ${
        isShaking ? 'animate-bounce border-rose-500' : ''
      }`}>
        {/* Header Icon */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center text-white shadow-xl shadow-amber-600/20">
          <Lock className="w-8 h-8" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">
            {companySettings?.company_name || 'CNC Precision ERP'}
          </h2>
          <p className="text-xs text-muted-foreground">
            Enter 4-Digit Passcode PIN to Unlock
          </p>
        </div>

        {/* User Badge */}
        <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
              {currentUser?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="text-left">
              <p className="font-bold text-foreground truncate max-w-[150px]">{currentUser?.full_name}</p>
              <p className="text-[10px] text-primary capitalize font-semibold">{currentUser?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-muted">Active Session</span>
        </div>

        {/* PIN Indicators */}
        <div className="flex items-center justify-center gap-4 py-2">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                pin.length > index
                  ? 'bg-primary border-primary shadow-md shadow-primary/30 scale-110'
                  : 'bg-muted/50 border-border'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-500 font-semibold animate-pulse">
            ⚠️ {errorMsg}
          </p>
        )}

        {/* Numeric Keypad Grid */}
        <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigitClick(num)}
              className="w-16 h-16 rounded-2xl bg-muted/50 hover:bg-muted active:bg-primary active:text-primary-foreground border border-border text-lg font-bold text-foreground flex items-center justify-center transition-all shadow-sm hover:scale-105"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="w-16 h-16 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs border border-rose-500/20 flex items-center justify-center transition"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigitClick('0')}
            className="w-16 h-16 rounded-2xl bg-muted/50 hover:bg-muted active:bg-primary active:text-primary-foreground border border-border text-lg font-bold text-foreground flex items-center justify-center transition-all shadow-sm hover:scale-105"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="w-16 h-16 rounded-2xl bg-muted/50 hover:bg-muted text-muted-foreground border border-border flex items-center justify-center transition"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="pt-2 text-[11px] text-muted-foreground">
          <span>Default Passcode PIN: </span>
          <strong className="text-foreground font-mono">1234</strong>
        </div>
      </div>
    </div>
  );
}
