import { createContext, useContext } from 'react';
import type { Trade } from '../types';

/**
 * Tüm işlemler (filtresiz). App sağlar; işlem detayı gibi her yerden açılan pencereler
 * kurulum geçmişi ve disiplin hesabı için tam geçmişe prop zinciri olmadan ulaşır.
 */
export const AllTradesContext = createContext<Trade[] | null>(null);
export const useAllTrades = () => useContext(AllTradesContext);
