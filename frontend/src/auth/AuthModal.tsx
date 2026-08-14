import { useEffect, useRef, useState } from 'react';
import { Alert, AlertIcon, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Spinner, Text } from '@chakra-ui/react';
import { ls } from '../theme/langsift';

interface CredentialResponse { credential: string }

const loadGoogleScript = (): Promise<void> => new Promise((resolve, reject) => {
  if (window.google?.accounts?.id) return resolve();
  const existing = document.querySelector<HTMLScriptElement>('script[data-langsift-gis]');
  if (existing) {
    existing.addEventListener('load', () => resolve(), { once: true });
    existing.addEventListener('error', () => reject(new Error('GIS failed to load')), { once: true });
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  script.dataset.langsiftGis = 'true';
  script.onload = () => resolve();
  script.onerror = () => reject(new Error('GIS failed to load'));
  document.head.appendChild(script);
});

export const AuthModal = ({ isOpen, onClose, onCredential }: { isOpen: boolean; onClose: () => void; onCredential: (credential: string) => Promise<void> }) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    submittingRef.current = false;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google sign-in is not configured for this environment.');
      return;
    }
    setError('');
    loadGoogleScript().then(() => {
      if (!buttonRef.current) return;
      buttonRef.current.replaceChildren();
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }: CredentialResponse) => {
          if (submittingRef.current) return;
          submittingRef.current = true;
          setLoading(true);
          setError('');
          try { await onCredential(credential); }
          catch {
            submittingRef.current = false;
            setError('Google sign-in could not be completed. Please try again.');
          }
          finally { setLoading(false); }
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, { theme: 'outline', size: 'large', width: 280, text: 'continue_with' });
    }).catch(() => setError('Google sign-in could not be loaded. Please try again.'));
  }, [isOpen, onCredential]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size={{ base: 'xs', sm: 'md' }}>
      <ModalOverlay bg="rgba(16, 47, 51, 0.42)" />
      <ModalContent mx={4} borderRadius="16px" bg={ls.surface} color={ls.textPrimary}>
        <ModalHeader pt={8} px={8} fontFamily={ls.editorialFont} fontSize="2xl">Save your progress</ModalHeader>
        <ModalCloseButton top={3} right={3} w="44px" h="44px" />
        <ModalBody px={8} pb={9}>
          <Text color={ls.textSecondary} lineHeight="1.7">Sign in to keep your lessons, vocabulary, and reviews across sessions.</Text>
          <div ref={buttonRef} style={{ marginTop: 24, minHeight: 44 }} />
          {loading && <Spinner mt={4} size="sm" color={ls.brand} />}
          {error && <Alert mt={4} status="error" borderRadius="10px"><AlertIcon />{error}</Alert>}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
