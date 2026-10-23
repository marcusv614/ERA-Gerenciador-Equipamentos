import { createContext } from 'react';

// Restringe também as prévias do Admin; a API sempre intersecta com a permissão real.
export const ContextoEscopoAuditoria = createContext(null);
