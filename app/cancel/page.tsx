'use client';

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
} from '@chakra-ui/react';
import { FiXCircle, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';

export default function CancelPage() {
  return (
    <Container maxW="md" py={20}>
      <VStack spacing={8}>
        <Card>
          <CardBody>
            <VStack spacing={6} textAlign="center">
              <Icon as={FiXCircle} boxSize={16} color="red.500" />
              <Box>
                <Heading size="lg" color="red.600" mb={2}>
                  Pago Cancelado
                </Heading>
                <Text color="gray.600">
                  El pago fue cancelado. No se realizó ningún cargo.
                </Text>
              </Box>

              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  Puedes intentar nuevamente cuando estés listo.
                </Text>
              </Alert>

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
