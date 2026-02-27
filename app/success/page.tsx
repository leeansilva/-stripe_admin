'use client';

import { useEffect, useState, Suspense } from 'react';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  Icon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  HStack,
  Spinner,
} from '@chakra-ui/react';
import { FiCheckCircle, FiArrowLeft } from 'react-icons/fi';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [finalizedError, setFinalizedError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      finalizeSession(sessionId);
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const finalizeSession = async (sid: string) => {
    setFinalizing(true);
    try {
      const response = await fetch('/api/finalize-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid }),
      });
      const data = await response.json();
      if (response.ok) {
        setFinalized(true);
      } else {
        setFinalizedError(data.error || 'Error al limitar la suscripción');
      }
    } catch (err) {
      setFinalizedError('Error de conexión al procesar la sesión');
    } finally {
      setFinalizing(false);
      setLoading(false);
    }
  };

  if (loading || finalizing) {
    return (
      <Container maxW="md" py={20}>
        <VStack spacing={4}>
          <Spinner size="xl" color="brand.500" />
          <Text>{finalizing ? 'Configurando límite de pagos...' : 'Verificando pago...'}</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="md" py={20}>
      <VStack spacing={8}>
        <Card>
          <CardBody>
            <VStack spacing={6} textAlign="center">
              <Icon as={FiCheckCircle} boxSize={16} color="green.500" />
              <Box>
                <Heading size="lg" color="green.600" mb={2}>
                  ¡Pago Exitoso!
                </Heading>
                <Text color="gray.600">
                  Tu suscripción ha sido creada correctamente.
                </Text>
              </Box>

              {finalized && (
                <Alert status="success" borderRadius="md">
                  <AlertIcon />
                  <AlertDescription fontSize="sm">
                    Límite de pagos configurado exitosamente.
                  </AlertDescription>
                </Alert>
              )}

              {finalizedError && (
                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle fontSize="sm">Nota sobre la duración</AlertTitle>
                    <AlertDescription fontSize="xs">
                      {finalizedError}. Por favor contacta a soporte para verificar el límite de pagos.
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              {sessionId && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>ID de Sesión</AlertTitle>
                    <AlertDescription fontSize="xs" fontFamily="mono">
                      {sessionId}
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              <VStack spacing={3} align="stretch" mt={4}>
                <Text fontSize="sm" color="gray.600">
                  Recibirás un email de confirmación de Stripe con los detalles
                  de tu suscripción.
                </Text>
                {finalized && (
                  <Text fontSize="sm" color="green.600" fontWeight="semibold">
                    Confirmado: La suscripción se cancelará automáticamente después de
                    completar todos los pagos configurados.
                  </Text>
                )}
              </VStack>

              <Link href="/" style={{ width: '100%' }}>
                <Button
                  colorScheme="brand"
                  leftIcon={<Icon as={FiArrowLeft} />}
                  width="full"
                  mt={4}
                >
                  Volver al Inicio
                </Button>
              </Link>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <Container maxW="md" py={20}>
          <VStack spacing={4}>
            <Spinner size="xl" color="brand.500" />
            <Text>Cargando...</Text>
          </VStack>
        </Container>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
