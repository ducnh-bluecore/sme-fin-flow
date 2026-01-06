import { createContext, useContext, useState, ReactNode } from 'react';

export type ForecastMethod = 'ai' | 'simple';

interface ForecastMethodContextType {
  method: ForecastMethod;
  setMethod: (method: ForecastMethod) => void;
}

const ForecastMethodContext = createContext<ForecastMethodContextType | undefined>(undefined);

export function ForecastMethodProvider({ children }: { children: ReactNode }) {
  const [method, setMethod] = useState<ForecastMethod>('ai');

  return (
    <ForecastMethodContext.Provider value={{ method, setMethod }}>
      {children}
    </ForecastMethodContext.Provider>
  );
}

export function useForecastMethod() {
  const context = useContext(ForecastMethodContext);
  if (!context) {
    throw new Error('useForecastMethod must be used within a ForecastMethodProvider');
  }
  return context;
}
