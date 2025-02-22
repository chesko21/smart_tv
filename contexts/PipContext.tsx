import React, { createContext, useState, useContext } from 'react';

interface PipContextType {
  isInPipMode: boolean;
  pipUrl: string | null;
  pipChannel: any;
  setPipMode: (isInPip: boolean, url?: string, channel?: any) => void;
  exitPip: () => void;
}

const PipContext = createContext<PipContextType>({
  isInPipMode: false,
  pipUrl: null,
  pipChannel: null,
  setPipMode: () => {},
  exitPip: () => {},
});

export const PipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInPipMode, setIsInPipMode] = useState(false);
  const [pipUrl, setPipUrl] = useState<string | null>(null);
  const [pipChannel, setPipChannel] = useState<any>(null);

  const setPipMode = (isInPip: boolean, url?: string, channel?: any) => {
    setIsInPipMode(isInPip);
    if (url) setPipUrl(url);
    if (channel) setPipChannel(channel);
  };

  const exitPip = () => {
    setIsInPipMode(false);
    setPipUrl(null);
    setPipChannel(null);
  };

  return (
    <PipContext.Provider value={{ isInPipMode, pipUrl, pipChannel, setPipMode, exitPip }}>
      {children}
    </PipContext.Provider>
  );
};

export const usePip = () => useContext(PipContext);