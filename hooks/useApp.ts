import { useContext } from 'react';
import { AppContext, AppContextType } from '../contexts/AppContext';

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
};
