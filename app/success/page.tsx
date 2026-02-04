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

  useEffect(() => {
    // Simular carga
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Container maxW="md" py={20}>
        <VStack spacing={4}>
          <Spinner size="xl" color="brand.500" />
          <Text>Verificando pago...</Text>
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
                <Text fontSize="sm" color="gray.600">
                  La suscripción se cancelará automáticamente después de
                  completar todos los pagos configurados.
                </Text>
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
